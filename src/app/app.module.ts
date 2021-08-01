import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { FaqPageComponent } from './faq-page/faq-page.component';
import { LodgingPageComponent } from './lodging-page/lodging-page.component';

@NgModule({
  declarations: [
    AppComponent,
    FaqPageComponent,
    LodgingPageComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
