Sen kıdemli bir solution architect, senior backend developer, frontend architect ve product owner gibi davran.

Amaç:
Ebay üzerinden gelen siparişler için müşteri tasarım toplama, tasarım üretme, onay süreci, üretim ve kargo takibini yöneten full-stack bir sistem geliştir.

Sistem production-ready olacak. Tüm edge-case’ler düşünülmeli. Event-driven, scalable ve modüler bir yapı kurulmalı.

---

# 🧠 GENEL SİSTEM AKIŞI

1. Ebay siparişi alınır (manuel giriş olacak)
2. Sipariş bir veya birden fazla ürün (SKU) içerebilir
3. Sipariş sisteme girilir:
   - EbayOrderNo (zorunlu)
   - SKU (zorunlu)
   - Email (zorunlu ama sonradan girilebilir)
   - Customer bilgileri

4. Müşteri için 3 seçenekli tasarım akışı:

   A) Müşteri kendi tasarımını yükler
   B) Müşteri bizden tasarım ister
   C) Hazır template seçer

---

# 👤 CUSTOMER DATA MODEL

Customer:
- Id
- CustomerName (firma adı)
- Email
- MobilePhone
- Phone
- AddressLine1
- AddressLine2
- City (Town)
- County
- PostCode
- Country

NOT:
PostCode üzerinden otomatik adres doldurma entegrasyonu yapılabilir (UK postcode lookup API).

---

# 📦 ORDER MODEL

Order:
- Id
- EbayOrderNo
- Status (Draft, WaitingDesign, InDesign, WaitingApproval, Approved, Rejected, InProduction, Shipped)
- CreatedDate

OrderItem:
- Id
- OrderId
- SKU
- Quantity

---

# 🎨 DESIGN FLOW

DesignRequest:
- Id
- OrderId
- OrderItemId
- Type (CustomerUpload, RequestFromUs, Template)
- Status (WaitingUpload, InDesign, WaitingApproval, Approved, Rejected)

DesignFile:
- Id
- DesignRequestId
- FileType (pdf, jpg, psd, ai, tiff)
- FileUrl
- UploadedBy (Customer/Admin)
- Version

---

# 📤 FILE UPLOAD

Desteklenecek formatlar:
- PDF
- JPG
- PSD
- AI
- TIFF

Dosyalar cloud storage (S3 veya Azure Blob) üzerinde tutulmalı.

---

# 🔄 DESIGN APPROVAL WORKFLOW

1. Müşteri tasarım yükler veya biz tasarım hazırlarız
2. Sistem "Onay Bekliyor" durumuna geçer
3. Müşteriye email gönderilir:
   - Preview görsel
   - Onay / Red linkleri

4. Eğer RED:
   - Red nedeni zorunlu
   - Status → Rejected
   - tekrar tasarım süreci başlar

5. Eğer ONAY:
   - Status → Approved
   - Final artwork kilitlenir

6. Final onay sonrası:
   - Son onay görseli tekrar gönderilir (final proof)

---

# 🏭 PRODUCTION FLOW

Approved sonrası:

OrderStatus:
→ InProduction

Üretim tamamlanınca:
→ Shipped

---

# 🚚 SHIPPING & INTEGRATION

Royal Mail entegrasyonu yapılacak:

Servis:
- Tracking48
- Next Business Day

Shipment:
- TrackingNumber
- Carrier (RoyalMail)
- ShipmentDate
- DeliveryType (Tracked48, NextDay)

Tracking API entegre edilecek.

---

# 📧 EMAIL NOTIFICATION SYSTEM

Event-driven email sistemi kurulmalı:

Triggerlar:
- Design upload request
- Design approval request
- Rejection
- Final approval
- Shipment

Template engine kullanılmalı.

---

# ⚙️ BACKEND TEKNİK DETAYLAR

- .NET 9
- Clean Architecture
- CQRS + MediatR
- MSSQL
- FluentValidation
- Domain Events
- Background Jobs (Hangfire / Quartz)

---

# 🎯 FRONTEND

- React + Vite
- Tailwind UI
- Admin Panel

Ekranlar:

1. Order List
2. Order Detail
3. Design Upload Screen
4. Approval Screen
5. Customer Portal (link ile erişim)

---

# 🔐 AUTH

- Admin login
- Customer token-based access (email link)

---

# 📊 EKSTRA

- Audit log
- Versioning (design file)
- Retry mekanizmaları
- Error handling
- API rate limit

---

# 🎯 OUTPUT BEKLENTİSİ

Şunları üret:

1. Database schema (tam)
2. Backend project structure
3. API endpoints (tüm)
4. Frontend component yapısı
5. Workflow state machine
6. Integration layer (Royal Mail)
7. Email template örnekleri
8. Sample seed data

Kod production seviyesinde olmalı.