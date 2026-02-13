import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ApiService, CartItem } from '../../services/api.service';

@Component({
  selector: 'app-cart',
  imports: [CommonModule, RouterModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {
  cartItems: CartItem[] = [];
  total = 0;

  constructor(
    public apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.apiService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
    });
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  updateQuantity(index: number, newQuantity: number) {
    this.apiService.updateCartItemQuantity(index, newQuantity);
  }

  removeItem(index: number) {
    this.apiService.removeFromCart(index);
  }

  clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
      this.apiService.clearCart();
    }
  }

  proceedToCheckout() {
    if (this.apiService.isAuthenticated()) {
      this.router.navigate(['/checkout']);
    } else {
      this.router.navigate(['/checkout']);
    }
  }
}
