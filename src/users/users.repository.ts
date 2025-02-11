import { Injectable } from '@nestjs/common';
import { DynamoDBService } from '../database/dynamodb.service';
import {
  GetCommand,
  PutCommand,
  UpdateCommand,
  ScanCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UsersRepository {
  private tableName: string;

  constructor(
    private dynamoDBService: DynamoDBService,
    private configService: ConfigService,
  ) {
    this.tableName = this.configService.get<string>('DYNAMODB_TABLE');

    if (!this.tableName) {
      throw new Error('DYNAMODB_TABLE 환경 변수가 설정되지 않았습니다.');
    }
  }

  async findByName(name: string) {
    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: '#name = :name',
      ExpressionAttributeNames: {
        '#name': 'name',
      },
      ExpressionAttributeValues: {
        ':name': name,
      },
    });
    const result = await this.dynamoDBService.getClient().send(command);
    return result.Items?.[0] || null;
  }

  async updateUser(uid: string, updatedUser: any) {
    console.log('Updating user:', { uid, updatedUser });

    // 새로운 항목 생성 (id를 파티션 키로 사용)
    const putCommand = new PutCommand({
      TableName: this.tableName,
      Item: {
        users: updatedUser.id, // id를 새로운 파티션 키로 사용
        name: updatedUser.name,
        password: updatedUser.password,
        uid: uid,
        secret: updatedUser.secret,
      },
    });
    await this.dynamoDBService.getClient().send(putCommand);

    // 이전 항목 삭제 (uid를 파티션 키로 사용한 항목)
    const deleteCommand = new DeleteCommand({
      TableName: this.tableName,
      Key: { users: uid },
    });
    await this.dynamoDBService.getClient().send(deleteCommand);

    return { message: 'User updated successfully' };
  }

  async createUser(user: any) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        users: user.name,
        ...user,
      },
    });
    return this.dynamoDBService.getClient().send(command);
  }

  async createInitialUser(user: any) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        users: user.uid, // uid를 파티션 키로 사용
        name: user.name,
        secret: user.secret,
        uid: user.uid,
      },
    });
    return this.dynamoDBService.getClient().send(command);
  }

  async findByUid(uid: string) {
    if (!uid) {
      return { Item: null };
    }

    const command = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'uid = :uid',
      ExpressionAttributeValues: {
        ':uid': uid,
      },
    });
    const result = await this.dynamoDBService.getClient().send(command);
    return { Item: result.Items?.[0] };
  }

  async findById(id: string) {
    if (!id) {
      return { Item: null };
    }

    console.log('Finding user by id:', id);

    // 먼저 GetCommand로 시도
    const getCommand = new GetCommand({
      TableName: this.tableName,
      Key: { users: id },
    });

    const getResult = await this.dynamoDBService.getClient().send(getCommand);
    console.log('Get result:', getResult);

    if (getResult.Item) {
      return { Item: getResult.Item };
    }

    // GetCommand로 찾지 못한 경우 ScanCommand로 시도
    const scanCommand = new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'id = :id',
      ExpressionAttributeValues: {
        ':id': id,
      },
    });

    const scanResult = await this.dynamoDBService.getClient().send(scanCommand);
    console.log('Scan result:', scanResult);

    return { Item: scanResult.Items?.[0] };
  }

  async updateRefreshToken(id: string, refreshToken: string) {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: { users: id }, // id를 파티션 키로 사용
      UpdateExpression: 'SET refreshToken = :rt',
      ExpressionAttributeValues: {
        ':rt': refreshToken,
      },
    });
    return this.dynamoDBService.getClient().send(command);
  }
}
