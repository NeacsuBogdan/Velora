import { Controller, Get, Param } from "@nestjs/common";

import { CatalogService } from "./catalog.service";

@Controller("catalog")
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("overview")
  getOverview() {
    return this.catalogService.getOverview();
  }

  @Get("navigation")
  getNavigation() {
    return this.catalogService.getNavigation();
  }

  @Get("categories/:slug")
  getCategoryDetail(@Param("slug") slug: string) {
    return this.catalogService.getCategoryDetail(slug);
  }

  @Get("products/:slug")
  getProductDetail(@Param("slug") slug: string) {
    return this.catalogService.getProductDetail(slug);
  }
}
