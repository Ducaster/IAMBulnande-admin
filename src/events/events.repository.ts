import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../database/dynamodb.service';
import {
  PutCommand,
  GetCommand,
  ScanCommand,
  UpdateCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ReturnValue } from '@aws-sdk/client-dynamodb';
import { ConfigService } from '@nestjs/config';
import { Event } from './event.entity';
import { getCurrentKSTDateISOString } from '../utils/date.utils';

@Injectable()
export class EventsRepository {
  constructor(
    private dynamoDBService: DynamoDBService,
    private configService: ConfigService,
  ) {}

  private getTableName(): string {
    return this.configService.get<string>('DYNAMODB_TABLE_EVENTS');
  }

  async createEvent(event: Event) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      Item: {
        PK: `EVENT#${event.uid}`,
        SK: 'METADATA',
        ...event,
      },
    };

    try {
      await this.dynamoDBService.getClient().send(new PutCommand(params));
      return event;
    } catch (error) {
      console.error('이벤트 생성 중 오류 발생:', error);
      throw error;
    }
  }

  async getEvent(uid: string) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      Key: {
        PK: `EVENT#${uid}`,
        SK: 'METADATA',
      },
    };

    const result = await this.dynamoDBService
      .getClient()
      .send(new GetCommand(params));
    return result.Item;
  }

  async getAllEvents(options: {
    limit?: number;
    lastEvaluatedKey?: string;
    homepage?: string;
    all?: boolean;
  }) {
    const { lastEvaluatedKey, homepage, all } = options;

    // all=true이면 매우 큰 limit 값을 사용하여 사실상 전체 데이터를 가져옵니다
    // 그렇지 않으면 지정된 limit 또는 기본값 10을 사용합니다
    const limit = all
      ? 1000 // 매우 큰 값으로 설정 (DynamoDB에서 한 번에 가져올 수 있는 최대치에 가까운 값)
      : options.limit
        ? parseInt(String(options.limit), 10)
        : 10;

    const tableName = this.getTableName();

    // 기본 필터: SK = 'METADATA'
    let filterExpression = 'SK = :sk';
    const expressionAttributeValues: Record<string, any> = {
      ':sk': 'METADATA',
    };

    // homepage 필터 추가
    if (homepage) {
      filterExpression += ' AND homepage = :homepage';
      expressionAttributeValues[':homepage'] = homepage;
    }

    const params: any = {
      TableName: tableName,
      FilterExpression: filterExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      Limit: all ? undefined : limit * 3, // all=true일 경우 Limit을 설정하지 않음
    };

    // 시작 위치 설정 (마지막 페이지 키가 제공된 경우)
    if (lastEvaluatedKey) {
      try {
        params.ExclusiveStartKey = JSON.parse(
          Buffer.from(lastEvaluatedKey, 'base64').toString(),
        );
      } catch (error) {
        console.error('LastEvaluatedKey 파싱 오류:', error);
      }
    }

    // all=true이고 데이터가 많은 경우 여러 번 스캔해야 할 수 있습니다
    let allItems: any[] = [];
    let result;

    do {
      result = await this.dynamoDBService
        .getClient()
        .send(new ScanCommand(params));

      if (result.Items && result.Items.length > 0) {
        allItems = [...allItems, ...result.Items];
      }

      // 다음 페이지가 있고 all=true인 경우 계속 스캔
      if (result.LastEvaluatedKey && all) {
        params.ExclusiveStartKey = result.LastEvaluatedKey;
      } else {
        break;
      }
    } while (true);

    // 사용할 아이템 배열 결정
    let items = all ? allItems : result?.Items || [];

    // project_date 기준으로 최신순 정렬 (내림차순)
    items = items.sort((a, b) => {
      // 날짜 비교 (내림차순: 최신 날짜가 먼저)
      // project_date가 있는 경우 이전 버전 호환성을 위해 함께 고려
      const aDate = a.start_date || a.project_date;
      const bDate = b.start_date || b.project_date;

      if (aDate && bDate) {
        return aDate < bDate ? 1 : aDate > bDate ? -1 : 0;
      }
      return 0;
    });

    // 총 항목 수
    const totalItems = items.length;

    // all=true인 경우 모든 항목을 반환, 그렇지 않으면 제한된 개수만 반환
    const limitedItems = all ? items : items.slice(0, limit);

    // 더 많은 항목이 있는지 확인
    const hasMore = !all && totalItems > limitedItems.length;

    // 다음 페이지 키 생성 (all=true인 경우에는 nextPageKey를 생성하지 않음)
    let nextPageKey = null;

    if (hasMore) {
      // 더 많은 항목이 있으면, 마지막으로 반환된 항목을 기준으로 다음 페이지 키 생성
      if (limitedItems.length > 0) {
        const lastItem = limitedItems[limitedItems.length - 1];
        // DynamoDB의 LastEvaluatedKey 형식에 맞춰 키 생성
        const customKey = {
          PK: lastItem.PK,
          SK: lastItem.SK,
        };
        nextPageKey = Buffer.from(JSON.stringify(customKey)).toString('base64');
      }
    }

    return {
      items: limitedItems,
      count: limitedItems.length,
      nextPageKey,
      totalCount: totalItems,
      hasMore,
    };
  }

  async updateEvent(uid: string, eventData: Partial<Event>) {
    const tableName = this.getTableName();
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    for (const [key, value] of Object.entries(eventData)) {
      if (value !== undefined) {
        updateExpressions.push(`#${key} = :${key}`);
        expressionAttributeValues[`:${key}`] = value;
        expressionAttributeNames[`#${key}`] = key;
      }
    }

    // 여기서 updated_at이 이미 포함되어 있지 않을 때만 추가
    if (!('updated_at' in eventData)) {
      const now = getCurrentKSTDateISOString();
      updateExpressions.push('#updated_at = :updated_at');
      expressionAttributeValues[':updated_at'] = now;
      expressionAttributeNames['#updated_at'] = 'updated_at';
    }

    if (updateExpressions.length === 0) {
      throw new Error('No fields to update');
    }

    const params = {
      TableName: tableName,
      Key: {
        PK: `EVENT#${uid}`,
        SK: 'METADATA',
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: ReturnValue.ALL_NEW,
    };

    try {
      const result = await this.dynamoDBService
        .getClient()
        .send(new UpdateCommand(params));
      return result.Attributes;
    } catch (error) {
      console.error('이벤트 수정 중 오류 발생:', error);
      throw error;
    }
  }

  async deleteEvent(uid: string) {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      Key: {
        PK: `EVENT#${uid}`,
        SK: 'METADATA',
      },
    };

    try {
      await this.dynamoDBService.getClient().send(new DeleteCommand(params));
      return { message: 'Event deleted successfully' };
    } catch (error) {
      console.error('이벤트 삭제 중 오류 발생:', error);
      throw error;
    }
  }
}
