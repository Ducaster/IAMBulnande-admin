import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(private configService: ConfigService) {
    this.tableName = this.configService.get<string>('DYNAMODB_TABLE');

    // ✅ 환경 변수 값이 정상적으로 불러와지는지 콘솔 출력
    console.log(`DynamoDB Table Name: ${this.tableName}`);

    if (!this.tableName) {
      throw new Error('DYNAMODB_TABLE 환경 변수가 설정되지 않았습니다.');
    }

    this.client = DynamoDBDocumentClient.from(
      new DynamoDBClient({
        region: this.configService.get<string>('CUSTOM_AWS_REGION'),
      }),
    );
  }

  getClient() {
    return this.client;
  }

  getTableName() {
    return this.tableName;
  }
}
