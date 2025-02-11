import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('/api/v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('init')
  async createInitialUser(@Body() body: { name: string; secret: string }) {
    return await this.authService.createInitialUser(body.name, body.secret);
  }

  @Post('verify')
  async verifyUser(@Body() body: { name: string; secret: string }) {
    return await this.authService.verifyUser(body.name, body.secret);
  }

  @Post('register')
  async registerUser(
    @Body() body: { uid: string; id: string; password: string },
  ) {
    return await this.authService.registerUser(
      body.uid,
      body.id,
      body.password,
    );
  }

  @Post('login')
  login(@Body() { id, password }: { id: string; password: string }) {
    return this.authService.login(id, password);
  }

  @Post('refresh-token')
  refreshToken(@Body() { refreshToken }: { refreshToken: string }) {
    return this.authService.refreshAccessToken(refreshToken);
  }
}
