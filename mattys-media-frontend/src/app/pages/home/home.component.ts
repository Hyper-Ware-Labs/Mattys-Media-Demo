import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ApiService, Product } from '../../services/api.service';

@Component({
  selector: 'app-home',
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  featuredProducts: Product[] = [];
  categories = [
    { name: 'Business Cards', slug: 'business-cards', icon: '🃏' },
    { name: 'Banners', slug: 'banners', icon: '🎨' },
    { name: 'Posters', slug: 'posters', icon: '🖼️' }
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit() {
    this.apiService.seedProducts().subscribe();
    this.apiService.getProducts().subscribe(products => {
      this.featuredProducts = products.slice(0, 6);
    });
  }
}
