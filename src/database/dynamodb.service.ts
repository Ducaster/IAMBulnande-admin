import { Injectable } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DynamoDBService {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(private configService: ConfigService) {
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
