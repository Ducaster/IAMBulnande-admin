export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  },
  dynamodb: {
    tableName: process.env.DYNAMODB_TABLE,
  },
  awsRegion: process.env.AWS_REGION || 'us-east-1',
});
