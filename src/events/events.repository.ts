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

  async getAllEvents() {
    const tableName = this.getTableName();
    const params = {
      TableName: tableName,
      FilterExpression: 'SK = :sk',
      ExpressionAttributeValues: {
        ':sk': 'METADATA',
      },
    };

    const result = await this.dynamoDBService
      .getClient()
      .send(new ScanCommand(params));
    return result.Items;
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
