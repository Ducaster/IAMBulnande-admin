import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async registerUser(@Body() body: { id: string; password: string }) {
    return await this.authService.registerUser(body.id, body.password);
  }

  @Post('login')
  async login(@Body() { id, password }: { id: string; password: string }) {
    return await this.authService.login(id, password);
  }

  @Post('refresh-token')
  async refreshToken(@Body() { refreshToken }: { refreshToken: string }) {
    return await this.authService.refreshAccessToken(refreshToken);
  }
}
