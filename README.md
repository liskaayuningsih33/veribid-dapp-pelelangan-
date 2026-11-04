# 🌐 VeriBid — Decentralized Auction Platform (dApp Ethereum EVM)
> **Mockup Interaktif Berbasis Blockchain & Smart Contract Solidity**  
> Disesuaikan 100% dengan Laporan: *"Analisis Aktor dan Perancangan Smart Contract pada Sistem Blockchain"*  
> **Mata Kuliah:** Blockchain and Fintech | **Dosen:** Dhani Ariatmanto, S.Kom., M.Kom., Ph.D  
> **Tim Peneliti:** Haikal Raditya F., Fredrik Papilaya, Jesen Tanamas, Wd. Elda Zuwelda Yama, Liska Ayuningsih.

---

## 🚀 Cara Menjalankan & Membuka Mockup

Aplikasi ini dirancang sebagai **Single-Page Web3 Application (dApp)** mandiri tanpa perlu instalasi runtime yang rumit. 

1. **Buka File `index.html`**:
   - Lokasi file: `C:\Users\WINDOWS 11\.gemini\antigravity-ide\scratch\veribid-dapp\index.html`
   - Cukup **Double-Click** file `index.html` untuk langsung membukanya di browser favorit Anda (**Google Chrome**, **Microsoft Edge**, **Brave**, atau **Firefox**).
2. Tampilan otomatis menggunakan mode gelap ultra-modern (*Cyber-Glassmorphism*), tipografi *Plus Jakarta Sans* & *JetBrains Mono*, serta simulasi ekosistem EVM Sepolia Testnet.

---

## 🧩 Pemetaan Fitur Mockup dengan Bab Laporan Akademik

| Bab Laporan | Konsep di Dokumen | Implementasi Nyata pada Mockup |
| :--- | :--- | :--- |
| **Bab I: Pendahuluan** | Mengatasi kecurangan lelang konvensional (*shill-bidding*, penahanan dana terpusat, pengubahan tawaran). | **Zero-Custody Escrow**: Dana tidak dipegang rekening perantara, melainkan dikunci oleh smart contract dan tercatat publik. |
| **Bab II: Identifikasi Aktor** | 6 Aktor: Penjual, Peserta (Bidder), Admin, Auditor, Validator, dan Smart Contract otonom. | **Role Switcher Dropdown** di navbar: Pengguna dapat berganti peran secara langsung. Status dompet, saldo, dan hak akses berubah sesuai peran aktor. |
| **Bab III: Perancangan Smart Contract** | 3 Kontrak: `UserRegistry.sol`, `AuctionFactory.sol`, `Auction.sol` serta Pseudo-code Bab 3.3. | **Tab Smart Contract**: Dilengkapi *code viewer* interaktif dengan syntax Solidity asli, penjelasan fungsi, serta tab khusus Pseudo-code Bab 3.3. |
| **Bab III.3.B & III.4: Alur Eksekusi & Pull-Payment** | Pola *Pull-Payment* (`withdraw()`) dan Checks-Effects-Interactions untuk refund penawar kalah. | **Tombol & Modal Saldo Tarik (Pull)**: Saat tawaran terlampaui, dana peserta masuk ke `saldoTarik` dan dapat dicairkan mandiri tanpa risiko DoS revert. |
| **Bab IV: Analisis Risiko & Kasus Nyata** | Studi kasus **The DAO (2016)** (Reentrancy) & **Parity Multisig (2017)** (Access control/Init). | **Tab Analisis Risiko**: Komparasi mendalam dua kasus legendaris serta **Matriks Mitigasi OWASP Top 10** yang lolos audit. |
| **Bab IV.2.6: Pengawasan & Transparansi** | Pengawasan publik tanpa sensor, audit event logs dan state variables. | **Tab VeriScan Explorer**: Live block ticker, event log stream (`BidPlaced`, `AuctionCreated`, `Withdrawn`), dan storage query. |

---

## 🎮 Panduan Skenario Demo Interaktif

### 1. Simulasi Penawaran Lelang (Aktor: Peserta Lelang / Bidder)
1. Pastikan dropdown **Peran Aktif** di kanan atas memilih **Peserta Lelang (Bidder)**.
2. Di katalog lelang, pilih salah satu aset (misal: *Holographic Neural Genesis #042*).
3. Klik tombol **"Tawar Sekarang (placeBid)"**.
4. Muncul modal transaksi EVM. Masukkan nilai bid (harus $\ge$ batas minimal yang dihitung kontrak).
5. Klik **"Konfirmasi Transaksi (MetaMask)"**.
6. Amati:
   - Saldo ETH berkurang.
   - Tawaran tertinggi dan penawar teratas diperbarui secara instan.
   - Transaksi baru dan event `BidPlaced` tercatat di VeriScan Explorer dengan hash blockchain baru.

### 2. Simulasi Anti Shill-Bidding (Bab 3.3.B)
1. Ganti dropdown **Peran Aktif** menjadi **Penjual (Seller)**.
2. Coba tawar barang lelang milik penjual tersebut (*Holographic Neural Genesis* atau *Swiss Tourbillon*).
3. Tombol akan otomatis nonaktif atau memunculkan peringatan proteksi smart contract: `require(msg.sender != seller)`, membuktikan lelang bebas penawaran fiktif penjual.

### 3. Simulasi Penarikan Saldo Pengembalian (Pull Payment - Bab 3.4 Poin 4)
1. Sesuai Bab 3.4 dan 4.2.4, dana peserta yang kalah tawaran tidak ditransfer otomatis (*push*) demi menghindari serangan *Reentrancy* & *Denial of Service*.
2. Klik tombol **"💰 Saldo Tarik (Pull): X.XXX ETH"** di bilah atas.
3. Klik **"Tarik Dana ke Dompet Sekarang"**.
4. Kontrak mengeksekusi pola *Checks-Effects-Interactions*: saldo dinolkan di state internal terlebih dahulu sebelum Ether dikirim ke dompet.

### 4. Simulasi Pembuatan Lelang Baru (AuctionFactory.sol)
1. Klik tab **"Buat Lelang"**.
2. Masukkan nama barang, harga awal, kenaikan minimum, dan durasi.
3. Klik **"Deploy Lelang ke Blockchain (createAuction)"**.
4. Smart contract `AuctionFactory` memeriksa status KYC penjual di `UserRegistry`, lalu menginstansiasi kontrak `Auction` baru dan memancarkan event `AuctionCreated`.

### 5. Simulasi Pengawasan Admin & Circuit Breaker (Pausable)
1. Ganti peran menjadi **Admin/Auctioneer**.
2. Klik tombol **"Panel Pengawasan Admin"**.
3. Di modal admin:
   - Anda dapat menekan **"Jeda Darurat (Pause)"** untuk mengaktifkan *Circuit Breaker*. Saat lelang di-pause, peserta tidak dapat menawar demi investigasi keamanan.
   - Anda dapat mengelola whitelist KYC alamat wallet pada tabel `UserRegistry`.
   - Admin **TIDAK** memiliki hak untuk mengubah riwayat bid atau memilih pemenang secara sepihak (sesuai Bab II.2).

### 6. Simulasi Auditor & VeriScan Explorer
1. Ganti peran menjadi **Auditor / Regulator**.
2. Klik tab **"VeriScan Explorer"** untuk memantau ketinggian blok (*block height*), waktu blok konsensus Proof-of-Stake, serta log event smart contract secara real-time.
3. Klik tombol **"Audit State Kontrak"** pada kartu lelang untuk menginspeksi variabel storage on-chain.

---

## 📁 Struktur Berkas

```
veribid-dapp/
│
├── index.html       # Antarmuka dApp Web3 utama (Semantic HTML5, Accessible, ID-rich)
├── styles.css       # Desain sistem Cyber-Glassmorphism, animasi micro-interactions, dark mode
├── app.js           # Mesin simulasi Blockchain EVM, Multi-Actor State, Smart Contracts logic
└── README.md        # Dokumentasi lengkap dan panduan pemetaan akademik
```

---
*Dibuat untuk presentasi dan pengujian konsep Sistem Lelang Terdesentralisasi VeriBid (Blockchain & Fintech).*
