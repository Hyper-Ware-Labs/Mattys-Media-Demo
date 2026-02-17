import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  base_price: number;
  images: string[];
  specifications: any;
}

export interface CartItem {
  product_id: string;
  product_name: string;
  quantity: number;
  custom_text?: string;
  price: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  total: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:8000/api';
  private tokenKey = 'auth_token';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private cartItemsSubject = new BehaviorSubject<CartItem[]>([]);
  public cartItems$ = this.cartItemsSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem(this.tokenKey);
    if (token) {
      this.loadCurrentUser();
    }
    this.loadCartFromLocalStorage();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem(this.tokenKey);
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    });
  }

  private loadCartFromLocalStorage(): void {
    const cart = localStorage.getItem('cart');
    if (cart) {
      this.cartItemsSubject.next(JSON.parse(cart));
    }
  }

  private saveCartToLocalStorage(items: CartItem[]): void {
    localStorage.setItem('cart', JSON.stringify(items));
    this.cartItemsSubject.next(items);
  }

  // Products
  getProducts(category?: string): Observable<Product[]> {
    const url = category ? `${this.apiUrl}/products?category=${category}` : `${this.apiUrl}/products`;
    return this.http.get<Product[]>(url);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  seedProducts(): Observable<any> {
    return this.http.post(`${this.apiUrl}/products/seed`, {});
  }

  // Auth
  register(email: string, password: string, name: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/register`, { email, password, name })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          this.currentUserSubject.next(response.user);
          this.syncCartToServer();
          this.mergeServerCart();
        })
      );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.token);
          this.currentUserSubject.next(response.user);
          this.syncCartToServer();
          this.mergeServerCart();
        })
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    this.currentUserSubject.next(null);
  }

  loadCurrentUser(): void {
    this.http.get<User>(`${this.apiUrl}/auth/me`, { headers: this.getHeaders() })
      .subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => this.logout()
      });
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  // Cart (Local Storage)
  addToCart(item: CartItem): void {
    const currentCart = this.cartItemsSubject.value;
    const existingIndex = currentCart.findIndex(i =>
      i.product_id === item.product_id && i.custom_text === item.custom_text
    );

    if (existingIndex > -1) {
      currentCart[existingIndex].quantity += item.quantity;
    } else {
      currentCart.push(item);
    }

    this.saveCartToLocalStorage(currentCart);
  }

  removeFromCart(index: number): void {
    const currentCart = this.cartItemsSubject.value;
    currentCart.splice(index, 1);
    this.saveCartToLocalStorage(currentCart);
  }

  updateCartItemQuantity(index: number, quantity: number): void {
    const currentCart = this.cartItemsSubject.value;
    if (quantity <= 0) {
      this.removeFromCart(index);
    } else {
      currentCart[index].quantity = quantity;
      this.saveCartToLocalStorage(currentCart);
    }
  }

  clearCart(): void {
    this.saveCartToLocalStorage([]);
  }

  getCartTotal(): number {
    return this.cartItemsSubject.value.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  getCartCount(): number {
    return this.cartItemsSubject.value.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Sync cart to server (when user logs in)
  private syncCartToServer(): void {
    const items = this.cartItemsSubject.value;
    if (items.length > 0 && this.isAuthenticated()) {
      this.http.post(`${this.apiUrl}/cart`, { items }, { headers: this.getHeaders() })
        .subscribe({
          next: () => console.log('Cart synced to server'),
          error: (err) => console.error('Error syncing cart to server:', err)
        });
    }
  }

  // Merge server cart with local cart (when user logs in)
  private mergeServerCart(): void {
    if (this.isAuthenticated()) {
      this.http.get<Cart>(`${this.apiUrl}/cart`, { headers: this.getHeaders() })
        .subscribe({
          next: (serverCart) => {
            if (serverCart && serverCart.items && serverCart.items.length > 0) {
              const localItems = this.cartItemsSubject.value;
              const mergedItems = [...serverCart.items];

              // Add local items that aren't in server cart
              for (const localItem of localItems) {
                const existingIndex = mergedItems.findIndex(i =>
                  i.product_id === localItem.product_id && i.custom_text === localItem.custom_text
                );
                if (existingIndex > -1) {
                  // Item exists, add quantities
                  mergedItems[existingIndex].quantity += localItem.quantity;
                } else {
                  // New item, add it
                  mergedItems.push(localItem);
                }
              }

              this.saveCartToLocalStorage(mergedItems);
            }
          },
          error: (err) => console.error('Error fetching cart from server:', err)
        });
    }
  }

  // WhatsApp Checkout
  generateWhatsAppCheckout(): Observable<{ whatsapp_url: string; message: string }> {
    return this.http.post<{ whatsapp_url: string; message: string }>(
      `${this.apiUrl}/checkout/whatsapp`,
      {},
      { headers: this.getHeaders() }
    );
  }
}