/// <reference types="multer" />
import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { SetCategoryDto } from './dto/set-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/jwt-payload';

const MAX_AUDIO_SIZE_BYTES = 1 * 1024 * 1024;

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(user.id, dto);
  }

  @Post('voice')
  @UseInterceptors(FileInterceptor('audio'))
  createFromVoice(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_AUDIO_SIZE_BYTES }),
          new FileTypeValidator({
            skipMagicNumbersValidation: true,
            fileType: /^audio\//,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.transactionsService.createFromVoice(user.id, file);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('offset', new ParseIntPipe({ optional: true })) offset?: number,
  ) {
    return this.transactionsService.findAll(user.id, limit, offset);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.findOne(user.id, id);
  }

  @Patch(':id/category')
  setCategory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SetCategoryDto,
  ) {
    return this.transactionsService.setCategory(user.id, id, dto.categoryName);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transactionsService.remove(user.id, id);
  }
}
