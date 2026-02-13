import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ApiService, Product } from '../../services/api.service';

@Component({
  selector: 'app-products',
  imports: [CommonModule, RouterModule],
  templateUrl: './products.component.html',
  styleUrls: ['./products.component.scss']
})
export class ProductsComponent implements OnInit {
  products: Product[] = [];
  filteredProducts: Product[] = [];
  selectedCategory: string = 'all';
  categories = ['all', 'business-cards', 'banners', 'posters'];

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.selectedCategory = params['category'] || 'all';
      this.loadProducts();
    });
  }

  loadProducts() {
    if (this.selectedCategory === 'all') {
      this.apiService.getProducts().subscribe(products => {
        this.products = products;
        this.filteredProducts = products;
      });
    } else {
      this.apiService.getProducts(this.selectedCategory).subscribe(products => {
        this.products = products;
        this.filteredProducts = products;
      });
    }
  }

  getCategoryName(slug: string): string {
    const names: any = {
      'all': 'All Products',
      'business-cards': 'Business Cards',
      'banners': 'Banners',
      'posters': 'Posters'
    };
    return names[slug] || slug;
  }
}
