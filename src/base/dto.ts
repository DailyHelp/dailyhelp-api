export class BasePaginatedResponseDto {
  pagination?: {
    total: number;
    limit: number;
    page: number;
    size: number;
    pages: number;
    offset?: number;
  };

  data: any;
}
