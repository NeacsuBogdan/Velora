import { Controller, Get, Query } from "@nestjs/common";

import { SearchService } from "./search.service";

@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get("products")
  getProducts(@Query() query: Record<string, unknown>) {
    return this.searchService.searchProducts(query);
  }
}
