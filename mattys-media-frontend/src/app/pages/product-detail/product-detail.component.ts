import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService, Product, CartItem } from '../../services/api.service';

@Component({
  selector: 'app-product-detail',
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './product-detail.component.html',
  styleUrls: ['./product-detail.component.scss']
})
export class ProductDetailComponent implements OnInit {
  product: Product | null = null;
  currentImageIndex = 0;
  quantity = 1;
  customText = '';
  addingToCart = false;

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      this.apiService.getProduct(id).subscribe({
        next: (product) => this.product = product,
        error: () => this.router.navigate(['/products'])
      });
    });
  }

  nextImage() {
    if (this.product) {
      this.currentImageIndex = (this.currentImageIndex + 1) % this.product.images.length;
    }
  }

  prevImage() {
    if (this.product) {
      this.currentImageIndex = this.currentImageIndex === 0 
        ? this.product.images.length - 1 
        : this.currentImageIndex - 1;
    }
  }

  selectImage(index: number) {
    this.currentImageIndex = index;
  }

  addToCart() {
    if (!this.product) return;

    this.addingToCart = true;

    const cartItem: CartItem = {
      product_id: this.product.id,
      product_name: this.product.name,
      quantity: this.quantity,
      custom_text: this.customText || undefined,
      price: this.product.base_price
    };

    this.apiService.addToCart(cartItem);

    setTimeout(() => {
      this.addingToCart = false;
      this.router.navigate(['/cart']);
    }, 500);
  }

  getTotal(): number {
    return this.product ? this.product.base_price * this.quantity : 0;
  }
}
