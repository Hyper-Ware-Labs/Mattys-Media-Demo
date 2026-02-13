import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { ApiService, CartItem } from '../../services/api.service';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit {
  isAuthenticated = false;
  showAuth = true;
  isLogin = true;
  
  // Auth form
  email = '';
  password = '';
  name = '';
  authError = '';
  
  // Cart
  cartItems: CartItem[] = [];
  total = 0;
  
  // Checkout
  isProcessing = false;

  constructor(
    public apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit() {
    this.isAuthenticated = this.apiService.isAuthenticated();
    this.showAuth = !this.isAuthenticated;

    this.apiService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
      
      if (items.length === 0) {
        this.router.navigate(['/cart']);
      }
    });

    this.apiService.currentUser$.subscribe(user => {
      if (user) {
        this.isAuthenticated = true;
        this.showAuth = false;
      }
    });
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  toggleAuthMode() {
    this.isLogin = !this.isLogin;
    this.authError = '';
  }

  submitAuth() {
    this.authError = '';
    
    if (this.isLogin) {
      this.apiService.login(this.email, this.password).subscribe({
        next: () => {
          this.isAuthenticated = true;
          this.showAuth = false;
          // Force change detection
          setTimeout(() => {
            this.isAuthenticated = true;
            this.showAuth = false;
          }, 100);
        },
        error: (err) => {
          this.authError = err.error?.detail || 'Login failed. Please check your credentials.';
        }
      });
    } else {
      if (!this.name || !this.email || !this.password) {
        this.authError = 'Please fill in all fields';
        return;
      }
      this.apiService.register(this.email, this.password, this.name).subscribe({
        next: () => {
          this.isAuthenticated = true;
          this.showAuth = false;
          // Force change detection
          setTimeout(() => {
            this.isAuthenticated = true;
            this.showAuth = false;
          }, 100);
        },
        error: (err) => {
          this.authError = err.error?.detail || 'Registration failed. Please try again.';
        }
      });
    }
  }

  checkoutWithWhatsApp() {
    this.isProcessing = true;
    
    this.apiService.generateWhatsAppCheckout().subscribe({
      next: (response) => {
        window.open(response.whatsapp_url, '_blank');
        this.apiService.clearCart();
        setTimeout(() => {
          this.router.navigate(['/']);
        }, 2000);
      },
      error: (err) => {
        alert('Error generating checkout: ' + (err.error?.detail || 'Unknown error'));
        this.isProcessing = false;
      }
    });
  }
}
