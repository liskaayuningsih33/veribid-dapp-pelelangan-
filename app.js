/**
 * VeriBid — Decentralized Auction dApp Simulation
 * Berdasarkan Laporan Kelompok: Analisis Aktor & Perancangan Smart Contract
 * Haikal, Fredrik, Jesen, Elda, Liska (Mata Kuliah: Blockchain and Fintech)
 */

class VeriBidApp {
  constructor() {
    // Current Active Actor (Bab II Identifikasi Aktor)
    this.currentRole = 'bidder'; // 'bidder' | 'seller' | 'admin' | 'auditor' | 'validator'
    this.isWalletConnected = false; // Start disconnected so user can connect directly
    this.web3Connected = false;
    this.web3Account = null;
    this.web3Balance = '0.0000';
    this.web3ChainId = null;
    this.sepoliaChainIdHex = '0xaa36a7'; // Chain ID: 11155111
    this.sepoliaChainIdDec = 11155111;
    this.vbidBalance = 500; // Initial $VBID token balance
    this.web3ListenersSet = false;
    this.currentCategoryFilter = 'all';
    this.currentSearchQuery = '';

    // Mock Actors Dataset
    this.actors = {
      bidder: {
        id: 'bidder',
        name: 'Haikal Raditya (Bidder)',
        address: '0x71C84920A1b2F890D028481B2719B5aCdE39B2',
        balance: 14.85,
        isVerified: true,
        roleTitle: 'Peserta Lelang (Bidder)',
        desc: 'Anda dapat menawar barang lelang, mengunci deposit di escrow smart contract, dan menarik saldo pengembalian (Pull Payment) jika outbid.'
      },
      seller: {
        id: 'seller',
        name: 'Fredrik Papilaya (Seller)',
        address: '0x9D28841B2048CdEb4399e01726aA590829148841',
        balance: 22.40,
        isVerified: true,
        roleTitle: 'Penjual (Seller)',
        desc: 'Anda dapat menerbitkan lelang baru melalui AuctionFactory.createAuction(), memantau tawaran masuk, dan menarik hasil lelang setelah selesai.'
      },
      admin: {
        id: 'admin',
        name: 'Dhani Ariatmanto (Auctioneer Admin)',
        address: '0x00A1d32Bca81902Eb7902De1920Eb401920Admin',
        balance: 50.00,
        isVerified: true,
        roleTitle: 'Admin / Penyelenggara Lelang',
        desc: 'Mengelola verifikasi KYC (UserRegistry), dan Circuit Breaker (Pause darurat). Sesuai Bab II, Admin TIDAK BISA memanipulasi bid atau menentukan pemenang.'
      },
      auditor: {
        id: 'auditor',
        name: 'Jesen & Liska (Regulator/Auditor)',
        address: '0xAud17082910FaCe29901720dE4029B88201Auditor',
        balance: 5.00,
        isVerified: true,
        roleTitle: 'Auditor / Pengamat Publik (Read-Only)',
        desc: 'Akses transparansi penuh ke seluruh event log (AuctionCreated, BidPlaced), verifikasi kode Solidity, dan audit alur Checks-Effects-Interactions.'
      },
      validator: {
        id: 'validator',
        name: 'Ethereum EVM Node Validator #42',
        address: '0xVaL1da70rN0deEVM884920194829148201948291',
        balance: 320.00,
        isVerified: true,
        roleTitle: 'Validator Jaringan Ethereum (PoS)',
        desc: 'Memvalidasi blok transaksi, mengeksekusi konsensus Proof-of-Stake, dan memelihara keutuhan buku besar terdistribusi.'
      }
    };

    // UserRegistry Whitelist State (Address -> verified status)
    this.userRegistry = {
      '0x71C84920A1b2F890D028481B2719B5aCdE39B2': { name: 'Haikal Raditya (Bidder)', verified: true, time: '2026-10-20' },
      '0x9D28841B2048CdEb4399e01726aA590829148841': { name: 'Fredrik Papilaya (Seller)', verified: true, time: '2026-10-20' },
      '0x3aF8902E441029480194819028aBcD90284902E4': { name: 'Jesen Tanamas (Bidder)', verified: true, time: '2026-10-21' },
      '0x81C1102938491029384910293849102938491102': { name: 'Wd. Elda Zuwelda (Bidder)', verified: true, time: '2026-10-21' },
      '0x1992A72910482910482910482910482910481992': { name: 'Liska Ayuningsih (Bidder)', verified: true, time: '2026-10-22' },
      '0x9999999999999999999999999999999999999999': { name: 'Akun Belum Verifikasi (Unregistered)', verified: false, time: 'Pending' }
    };

    // Pull-Payment Escrow Balances (saldoTarik[address])
    this.saldoTarik = {
      '0x71C84920A1b2F890D028481B2719B5aCdE39B2': 1.25, // Haikal has pending refund from previous outbid!
      '0x3aF8902E441029480194819028aBcD90284902E4': 0.0,
      '0x9D28841B2048CdEb4399e01726aA590829148841': 0.0
    };

    // Circuit Breaker State (Pausable)
    this.isCircuitPaused = false;

    // Active Auctions Dataset
    this.auctions = [
      {
        id: 1,
        title: 'Holographic Neural Genesis #042',
        category: 'digital',
        contractAddress: '0x7bF928194cA8e80194720DbC918401827488A190',
        sellerAddress: '0x9D28841B2048CdEb4399e01726aA590829148841',
        sellerName: 'Fredrik Papilaya',
        startingPrice: 1.50,
        minIncrement: 0.25,
        currentHighestBid: 3.45,
        highestBidderAddress: '0x3aF8902E441029480194819028aBcD90284902E4',
        highestBidderName: 'Jesen Tanamas',
        totalBids: 7,
        durationSeconds: 1540, // ~25 min
        image: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_cyber_nft_1792665992651.jpg',
        description: 'Sertifikat hak cipta 3D NFT Holographic Interactive Art dengan enkripsi metadata IPFS QmZtmD2qtWBS7f7mQ11gW4wK9HwV8. Dilengkapi lisensi royalti otomatis 5% on-chain.',
        isFinalized: false,
        bidHistory: [
          { bidder: '0x3aF...902E', amount: 3.45, time: '3 menit lalu', tx: '0x812a...78a0' },
          { bidder: '0x71C...39B2', amount: 3.20, time: '12 menit lalu', tx: '0x948b...112e' },
          { bidder: '0x81C...1102', amount: 2.75, time: '28 menit lalu', tx: '0xcc19...49df' },
          { bidder: '0x3aF...902E', amount: 2.25, time: '45 menit lalu', tx: '0xfa34...0012' }
        ]
      },
      {
        id: 2,
        title: 'Aurum Chronometry Swiss Tourbillon',
        category: 'physical',
        contractAddress: '0x42E19018471902Ebc82910492817402948199B08',
        sellerAddress: '0x9D28841B2048CdEb4399e01726aA590829148841',
        sellerName: 'Fredrik Papilaya',
        startingPrice: 5.00,
        minIncrement: 0.50,
        currentHighestBid: 8.20,
        highestBidderAddress: '0x81C1102938491029384910293849102938491102',
        highestBidderName: 'Wd. Elda Zuwelda',
        totalBids: 11,
        durationSeconds: 4320, // ~1h 12m
        image: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_luxury_watch_1792666006981.jpg',
        description: 'Jam tangan mekanikal Tourbillon eksklusif dengan NFC cryptographic microchip yang tertaut ke smart contract VeriBid. Sertifikat kepemilikan ditransfer secara instan saat finalisasi.',
        isFinalized: false,
        bidHistory: [
          { bidder: '0x81C...1102', amount: 8.20, time: '8 menit lalu', tx: '0xa419...2284' },
          { bidder: '0x199...1992', amount: 7.50, time: '19 menit lalu', tx: '0xb231...99ef' },
          { bidder: '0x71C...39B2', amount: 6.80, time: '42 menit lalu', tx: '0x10fa...7781' }
        ]
      },
      {
        id: 3,
        title: 'Cliffhaven Eco-Luxury Villa Deed',
        category: 'rwa',
        contractAddress: '0x99A30291847291048291048291048291048CC219',
        sellerAddress: '0x71C84920A1b2F890D028481B2719B5aCdE39B2',
        sellerName: 'Haikal Raditya',
        startingPrice: 30.00,
        minIncrement: 2.00,
        currentHighestBid: 45.00,
        highestBidderAddress: '0x1992A72910482910482910482910482910481992',
        highestBidderName: 'Liska Ayuningsih',
        totalBids: 6,
        durationSeconds: 320, // ~5 min remaining (ready to test finalize)
        image: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_cyber_villa_1792666023584.jpg',
        description: 'Sertifikat kepemilikan Real World Asset (RWA) Villa Tepi Tebing dengan legalitas terdaftar pada notaris mitra dan tokenized escrow contract pada Sepolia EVM.',
        isFinalized: false,
        bidHistory: [
          { bidder: '0x199...1992', amount: 45.00, time: '1 menit lalu', tx: '0xdd41...9821' },
          { bidder: '0x3aF...902E', amount: 42.00, time: '14 menit lalu', tx: '0x4312...09ab' },
          { bidder: '0x81C...1102', amount: 38.00, time: '35 menit lalu', tx: '0x76ba...3319' }
        ]
      }
    ];

    // VeriScan Blockchain Explorer Mock Data
    this.currentBlockNumber = 8492150;
    this.recentBlocks = [
      { number: 8492150, txCount: 14, miner: '0x12a0...e391', time: '12 dtk lalu', gas: '1,420,180' },
      { number: 8492149, txCount: 8, miner: '0x8849...9942', time: '24 dtk lalu', gas: '890,200' },
      { number: 8492148, txCount: 22, miner: '0x33b1...bb10', time: '36 dtk lalu', gas: '2,109,300' },
      { number: 8492147, txCount: 11, miner: '0x12a0...e391', time: '48 dtk lalu', gas: '1,120,450' }
    ];

    this.contractEvents = [
      { event: 'BidPlaced', contract: 'Auction #3', txHash: '0xdd419a820b127498129038472910284729104829', bidder: '0x1992...1992', value: '45.00 ETH', time: '1 mnt lalu' },
      { event: 'BidPlaced', contract: 'Auction #1', txHash: '0x812a39bca01948201948201948201948201978a0', bidder: '0x3aF8...902E', value: '3.45 ETH', time: '3 mnt lalu' },
      { event: 'AuctionCreated', contract: 'AuctionFactory', txHash: '0x71a938c201948201948201948201948201948271', bidder: '0x9D28...8841', value: '0.00 ETH', time: '45 mnt lalu' },
      { event: 'UserVerified', contract: 'UserRegistry', txHash: '0x22b1093847291048291048291048291048291022', bidder: '0x00A1...Admin', value: '0.00 ETH', time: '2 jam lalu' }
    ];

    // Active Selected Auction for Modal
    this.selectedAuctionForBid = null;

    // Smart Contract Code Registry
    this.smartContracts = {
      Auction: {
        filename: 'Auction.sol',
        solidityVersion: 'Solidity ^0.8.20',
        type: 'Core Escrow & Bidding Contract',
        description: 'Menerima penawaran, mengunci escrow, mengelola penarikan penawar kalah dengan pola Pull-Payment, dan finalisasi lelang.',
        functions: ['placeBid() payable', 'withdraw()', 'finalizeAuction()', 'getAuctionDetails()'],
        events: ['BidPlaced(bidder, amount)', 'AuctionFinalized(winner, amount)', 'Withdrawn(account, amount)'],
        securityNotes: 'Checks-Effects-Interactions pattern mencegah reentrancy attacks; require(msg.sender != seller) memblokir shill-bidding.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeriBid Auction Contract
 * @dev Sesuai Perancangan Bab III & Bab IV Laporan Kelompok
 * Memanfaatkan Pola Checks-Effects-Interactions & Pull Payment
 */

interface IUserRegistry {
    function isVerified(address user) external view returns (bool);
}

contract Auction {
    // State Variables
    address public immutable seller;
    string public itemName;
    uint256 public immutable startingPrice;
    uint256 public immutable minIncrement;
    uint256 public immutable auctionEndTime;
    
    address public highestBidder;
    uint256 public highestBid;
    bool public ended;
    
    // Pull-Payment: Saldo pengembalian dana bagi peserta yang kalah tawaran
    mapping(address => uint256) public pendingReturns;
    
    IUserRegistry public immutable userRegistry;
    
    // Events
    event BidPlaced(address indexed bidder, uint256 amount, uint256 timestamp);
    event AuctionFinalized(address indexed winner, uint256 winningBid);
    event Withdrawn(address indexed recipient, uint256 amount);
    
    modifier onlyVerified() {
        require(userRegistry.isVerified(msg.sender), "VeriBid: Akun belum terverifikasi di UserRegistry");
        _;
    }
    
    constructor(
        string memory _itemName,
        uint256 _startingPrice,
        uint256 _minIncrement,
        uint256 _durationSeconds,
        address _seller,
        address _userRegistry
    ) {
        require(_durationSeconds > 0, "Durasi lelang harus > 0");
        itemName = _itemName;
        startingPrice = _startingPrice;
        minIncrement = _minIncrement;
        auctionEndTime = block.timestamp + _durationSeconds;
        seller = _seller;
        userRegistry = IUserRegistry(_userRegistry);
    }
    
    /**
     * @notice Mengirim penawaran pada lelang (Bab 3.3.B)
     */
    function placeBid() external payable onlyVerified {
        // 1. CHECKS (Pemeriksaan Kondisi)
        require(block.timestamp < auctionEndTime, "VeriBid: Lelang sudah berakhir");
        require(msg.sender != seller, "VeriBid: Penjual dilarang menawar barang sendiri (Anti-Shill)");
        
        uint256 minRequired = (highestBid == 0) ? startingPrice : highestBid + minIncrement;
        require(msg.value >= minRequired, "VeriBid: Nilai bid di bawah batas minimum");
        
        // 2. EFFECTS (Pembaruan State Internal)
        if (highestBidder != address(0)) {
            // Catat pengembalian dana untuk penawar tertinggi sebelumnya (Pull Payment)
            pendingReturns[highestBidder] += highestBid;
        }
        
        highestBidder = msg.sender;
        highestBid = msg.value;
        
        emit BidPlaced(msg.sender, msg.value, block.timestamp);
    }
    
    /**
     * @notice Penarikan dana refund bagi peserta yang kalah / penjual (Bab 3.4 Poin 4 & 6)
     * Menggunakan pola Checks-Effects-Interactions untuk menangkal Reentrancy Attack (Bab IV.2.4)
     */
    function withdraw() external returns (bool) {
        uint256 amount = pendingReturns[msg.sender];
        
        // Check
        require(amount > 0, "VeriBid: Saldo penarikan kosong");
        
        // Effect (Nol-kan saldo SEBELUM melakukan transfer Ether)
        pendingReturns[msg.sender] = 0;
        
        // Interaction (Transfer dana ke pemanggil)
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            // Revert jika gagal kirim
            pendingReturns[msg.sender] = amount;
            return false;
        }
        
        emit Withdrawn(msg.sender, amount);
        return true;
    }
    
    /**
     * @notice Menutup lelang setelah batas waktu tercapai (Bab 3.4 Poin 5)
     */
    function finalizeAuction() external {
        require(block.timestamp >= auctionEndTime, "VeriBid: Lelang masih berjalan");
        require(!ended, "VeriBid: Lelang sudah pernah difinalisasi");
        
        ended = true;
        
        // Teruskan dana hasil penjualan ke saldo tarik penjual
        if (highestBidder != address(0)) {
            pendingReturns[seller] += highestBid;
        }
        
        emit AuctionFinalized(highestBidder, highestBid);
    }
}`
      },

      AuctionFactory: {
        filename: 'AuctionFactory.sol',
        solidityVersion: 'Solidity ^0.8.20',
        type: 'Factory & Deployment Manager',
        description: 'Menerbitkan instance kontrak Auction baru, mencatat daftar alamat lelang, dan memancarkan event AuctionCreated.',
        functions: ['createAuction(nama, hargaAwal, kenaikanMin, durasi)', 'getAuctions()', 'getAuctionCount()'],
        events: ['AuctionCreated(idLelang, alamatLelang, penjual, namaBarang)'],
        securityNotes: 'Hanya penjual terverifikasi yang diizinkan memanggil createAuction.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Auction.sol";

/**
 * @title VeriBid AuctionFactory
 * @dev Sesuai Bab 3.2 Tabel Poin 2 & Bab 3.3.A Dokumen
 */
contract AuctionFactory {
    address public immutable userRegistry;
    address[] public allAuctions;
    
    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed auctionAddress,
        address indexed seller,
        string itemName,
        uint256 startingPrice
    );
    
    constructor(address _userRegistry) {
        require(_userRegistry != address(0), "UserRegistry tidak valid");
        userRegistry = _userRegistry;
    }
    
    /**
     * @notice Membuat dan mendaftarkan lelang baru
     */
    function createAuction(
        string memory _namaBarang,
        uint256 _hargaAwal,
        uint256 _kenaikanMin,
        uint256 _durasiDetik
    ) external returns (address newAuctionAddr) {
        // Validasi pengirim terverifikasi (Bab 3.3.A)
        require(IUserRegistry(userRegistry).isVerified(msg.sender), "VeriBid: Penjual belum terverifikasi");
        require(_durasiDetik > 0, "VeriBid: Durasi harus lebih dari 0");
        require(_hargaAwal > 0, "VeriBid: Harga awal harus > 0");
        
        // Buat contract Auction baru
        Auction auctionContract = new Auction(
            _namaBarang,
            _hargaAwal,
            _kenaikanMin,
            _durasiDetik,
            msg.sender,
            userRegistry
        );
        
        newAuctionAddr = address(auctionContract);
        allAuctions.push(newAuctionAddr);
        
        emit AuctionCreated(
            allAuctions.length - 1,
            newAuctionAddr,
            msg.sender,
            _namaBarang,
            _hargaAwal
        );
    }
    
    function getAuctionCount() external view returns (uint256) {
        return allAuctions.length;
    }
}`
      },

      UserRegistry: {
        filename: 'UserRegistry.sol',
        solidityVersion: 'Solidity ^0.8.20',
        type: 'KYC & Access Control Contract',
        description: 'Mendaftarkan dan memverifikasi alamat dompet peserta lelang (Seller & Bidder) menggunakan Role-Based Access Control.',
        functions: ['verifyUser(address)', 'revokeUser(address)', 'isVerified(address)'],
        events: ['UserVerified(address indexed user, address admin)', 'UserRevoked(address indexed user)'],
        securityNotes: 'OpenZeppelin AccessControl (DEFAULT_ADMIN_ROLE), mencegah sembarang pihak memverifikasi akun fiktif.',
        code: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title VeriBid UserRegistry
 * @dev Sesuai Bab 3.2 Tabel Poin 1 & Bab II Deskripsi Aktor Admin
 * Mencegah serangan Sybil & Shill-Bidding dengan KYC Whitelist
 */
contract UserRegistry {
    address public admin;
    
    mapping(address => bool) private _verifiedUsers;
    
    event UserVerified(address indexed account, address indexed verifiedBy);
    event UserRevoked(address indexed account);
    event AdminTransferred(address indexed oldAdmin, address indexed newAdmin);
    
    modifier onlyAdmin() {
        require(msg.sender == admin, "VeriBid: Hanya Admin yang berwenang");
        _;
    }
    
    constructor() {
        admin = msg.sender;
        _verifiedUsers[msg.sender] = true;
    }
    
    function verifyUser(address account) external onlyAdmin {
        require(account != address(0), "Alamat tidak valid");
        _verifiedUsers[account] = true;
        emit UserVerified(account, msg.sender);
    }
    
    function revokeUser(address account) external onlyAdmin {
        _verifiedUsers[account] = false;
        emit UserRevoked(account);
    }
    
    function isVerified(address account) external view returns (bool) {
        return _verifiedUsers[account];
    }
    
    function transferAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Admin baru tidak valid");
        emit AdminTransferred(admin, newAdmin);
        admin = newAdmin;
    }
}`
      },

      PseudoCode: {
        filename: 'Pseudo-code (Bab 3.3 Laporan)',
        solidityVersion: 'Algoritma Perancangan Sistem',
        type: 'Logika Pemrograman VeriBid',
        description: 'Rancangan logika algoritma fungsi pembuatan lelang dan penawaran sesuai yang tertulis pada Bab 3.3 laporan.',
        functions: ['createAuction()', 'placeBid()'],
        events: ['AuctionCreated', 'BidPlaced'],
        securityNotes: 'Pemisahan checks, penolakan transaksi otomatis (revert), dan kalkulasi batas minimum.',
        code: `// ========================================================
// BAB III PERANCANGAN SMART CONTRACT - 3.3 PSEUDO-CODE
// ========================================================

A. Pembuatan lelang (AuctionFactory.createAuction)
-------------------------------------------------
FUNCTION createAuction(namaBarang, hargaAwal, kenaikanMin, durasi):
    IF pengirim BELUM terverifikasi di UserRegistry
        THEN transaksi ditolak
    IF durasi <= 0
        THEN transaksi ditolak
    ELSE
        buat contract Auction baru
        simpan alamatnya ke daftar lelang
        EMIT AuctionCreated(idLelang, alamatLelang, pengirim)


B. Penawaran (Auction.placebid)
-------------------------------------------------
FUNCTION placeBid() PAYABLE:
    IF pengirim BELUM terverifikasi
        THEN transaksi ditolak
    IF waktuSekarang >= waktuBerakhir
        THEN transaksi ditolak (lelang berakhir)
    IF pengirim == penjual
        THEN transaksi ditolak
    
    batasMinimum = (belum ada bid) ? hargaAwal : bidTertinggi + kenaikanMin
    
    IF nilaiKiriman < batasMinimum
        THEN transaksi ditolak
    ELSE
        IF ada penawarTertinggiLama
            saldoTarik[penawarTertinggiLama] += bidTertinggiLama
        
        penawarTertinggi = pengirim
        bidTertinggi = nilaiKiriman
        EMIT BidPlaced(pengirim, nilaiKiriman)`
      }
    };
  }

  init() {
    this.bindEvents();
    this.renderRoleBanner();
    this.renderAuctionsGrid();
    this.renderBlockchainFeeds();
    this.switchContractCode('Auction');
    this.startCountdownTimer();
    this.updateWalletButtonUI();
    this.updateVbidDisplays();
    this.checkExistingWeb3Connection();

    const actor = this.actors[this.currentRole];
    if (actor) {
      this.updateLoginButtonUI(actor.name, this.isWalletConnected);
      this.updateLoginModalActiveUser();
    }
  }

  bindEvents() {
    // Navigation Tabs (Secondary tabs and pills)
    const navButtons = document.querySelectorAll('.nav-btn, .sim-tab-pill');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Actor Role Selector
    const actorSelect = document.getElementById('actorSelector');
    if (actorSelect) {
      actorSelect.addEventListener('change', (e) => {
        this.setActorRole(e.target.value);
      });
    }

    // Bid Input Live Calculation
    const bidInput = document.getElementById('bidAmountInput');
    if (bidInput) {
      bidInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value) || 0;
        document.getElementById('txValueDisplay').innerText = `${val.toFixed(2)} ETH`;
        const total = val + 0.00185;
        document.getElementById('txTotalDisplay').innerText = `${total.toFixed(4)} ETH`;
      });
    }

    // Global Escape Key to Close Modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeConnectWalletModal();
        this.closeWalletModal();
        this.closeLoginModal();
        this.closeBidModal();
        this.closeRefundModal();
        this.closeNoWeb3Modal();
        if (typeof this.closeAdminModal === 'function') this.closeAdminModal();
      }
    });
  }

  // ==========================================
  // NAVIGATION & SCROLL HANDLERS (Navbar)
  // ==========================================
  navTo(target, event) {
    if (event) event.preventDefault();

    // Set active link indicator
    document.querySelectorAll('.nav-menu-item').forEach(el => el.classList.remove('active'));
    const activeMap = {
      home: 'menuHome',
      lelang: 'menuLelang',
      tokenomics: 'menuTokenomics',
      tentang: 'menuTentang',
      faq: 'menuFaq'
    };
    const activeBtn = document.getElementById(activeMap[target]);
    if (activeBtn) activeBtn.classList.add('active');

    // Always bring the auctions/home pane into view
    this.switchTab('auctions');

    if (target === 'home') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (target === 'lelang') {
      this.scrollToAuctions();
    } else if (target === 'tokenomics') {
      this.scrollToTokenomics();
    } else if (target === 'tentang') {
      this.scrollToTentang();
    } else if (target === 'faq') {
      this.scrollToFaq();
    }
  }

  scrollToTokenomics() {
    this.switchTab('auctions');
    const target = document.getElementById('sectionTokenomics');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToAuctions(e) {
    if (e) e.preventDefault();
    this.switchTab('auctions');
    const target = document.getElementById('auctionFilterBar') || document.querySelector('.auction-filter-bar');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToTentang() {
    this.switchTab('auctions');
    const target = document.getElementById('sectionTentang');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToFaq() {
    this.switchTab('auctions');
    const target = document.getElementById('sectionFaq');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleFaq(itemEl) {
    const isActive = itemEl.classList.contains('active');
    document.querySelectorAll('.faq-item').forEach(el => {
      el.classList.remove('active');
      const icon = el.querySelector('.faq-toggle-icon');
      if (icon) icon.innerText = '+';
    });

    if (!isActive) {
      itemEl.classList.add('active');
      const icon = itemEl.querySelector('.faq-toggle-icon');
      if (icon) icon.innerText = '−';
    }
  }

  handleGlobalSearch(query) {
    this.currentSearchQuery = (query || '').trim().toLowerCase();
    this.renderAuctionsGrid(this.currentCategoryFilter, this.currentSearchQuery);
  }

  resetAuctionSearch() {
    this.currentSearchQuery = '';
    const searchInput = document.getElementById('navGlobalSearch');
    if (searchInput) searchInput.value = '';
    this.renderAuctionsGrid('all', '');
  }

  async handleWalletBtnClick() {
    if (this.isWalletConnected) {
      this.openWalletModal();
    } else {
      this.openConnectWalletModal();
    }
  }

  updateWalletButtonUI() {
    const btn = document.getElementById('navWalletBtn');
    const label = document.getElementById('navWalletBtnLabel');
    if (!btn || !label) return;

    if (this.isWalletConnected) {
      const actor = this.actors[this.currentRole];
      const addr = this.web3Account || actor.address;
      label.innerHTML = `<span class="connected-dot"></span> ${addr.slice(0, 5)}...${addr.slice(-4)}`;
      btn.classList.add('connected');
      const bal = this.web3Connected ? this.web3Balance : actor.balance.toFixed(2);
      btn.title = `Dompet Sepolia Terhubung: ${addr} (${bal} ETH | ${this.vbidBalance} $VBID). Klik untuk detail akun.`;
    } else {
      label.innerText = 'Connect Wallet';
      btn.classList.remove('connected');
      btn.title = 'Hubungkan dompet Web3 MetaMask ke Ethereum Sepolia Testnet';
    }
  }

  switchTab(tabId) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-pane').forEach(pane => {
      pane.classList.remove('active');
    });

    const targetPaneMap = {
      auctions: 'paneAuctions',
      create: 'paneCreate',
      contracts: 'paneContracts',
      security: 'paneSecurity',
      explorer: 'paneExplorer'
    };

    const targetId = targetPaneMap[tabId];
    if (targetId) {
      const pane = document.getElementById(targetId);
      if (pane) pane.classList.add('active');
    }

    if (tabId !== 'auctions') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  setActorRole(roleKey) {
    this.currentRole = roleKey;
    const actor = this.actors[roleKey];
    if (!actor) return;

    // Update wallet badge
    const addrEl = document.getElementById('walletAddressDisplay');
    if (addrEl) addrEl.innerText = `${actor.address.slice(0, 5)}...${actor.address.slice(-4)}`;
    const balEl = document.getElementById('walletBalanceDisplay');
    if (balEl) balEl.innerText = `${actor.balance.toFixed(3)} ETH`;

    // Sync actor selector
    const actorSelect = document.getElementById('actorSelector');
    if (actorSelect) actorSelect.value = roleKey;

    // Update Role Banner & Wallet Button
    this.renderRoleBanner();
    this.updateWalletButtonUI();

    // Update Login UI
    this.updateLoginButtonUI(actor.name, true);
    this.updateLoginModalActiveUser();

    // Show feedback toast
    this.showToast(`Beralih ke Peran: ${actor.roleTitle}`, `Alamat aktif: ${actor.address.slice(0, 10)}...`);

    // Re-render auctions to update conditional buttons (e.g., self-bid disabled for seller)
    this.renderAuctionsGrid();
  }

  renderRoleBanner() {
    const actor = this.actors[this.currentRole];
    if (!actor) return;

    const tagEl = document.getElementById('currentRoleTag');
    if (tagEl) tagEl.innerText = `MODE: ${actor.roleTitle.toUpperCase()}`;
    const descEl = document.getElementById('currentRoleDesc');
    if (descEl) descEl.innerText = actor.desc;

    // KYC Status badge
    const isKyc = this.userRegistry[actor.address]?.verified || false;
    const kycBadge = document.getElementById('kycStatusBadge');
    if (kycBadge) {
      if (isKyc) {
        kycBadge.innerHTML = `<span class="badge-dot green"></span> UserRegistry: Terverifikasi`;
        kycBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      } else {
        kycBadge.innerHTML = `<span class="badge-dot" style="background:#ef4444;"></span> UserRegistry: Belum KYC`;
        kycBadge.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      }
    }

    // Pending Refund button
    const refundBal = this.saldoTarik[actor.address] || 0;
    const refundEl = document.getElementById('refundBalanceNav');
    if (refundEl) refundEl.innerText = `${refundBal.toFixed(3)} ETH`;
    const refundBtn = document.getElementById('pendingRefundBtn');
    if (refundBtn) {
      if (refundBal > 0) {
        refundBtn.style.border = '1px solid var(--accent-cyan)';
        refundBtn.style.boxShadow = '0 0 10px rgba(0, 242, 254, 0.3)';
      } else {
        refundBtn.style.border = '1px solid var(--border-subtle)';
        refundBtn.style.boxShadow = 'none';
      }
    }
  }

  renderAuctionsGrid(filter = null, searchQuery = null) {
    if (filter !== null) this.currentCategoryFilter = filter;
    if (searchQuery !== null) this.currentSearchQuery = searchQuery;

    const activeFilter = this.currentCategoryFilter || 'all';
    const query = (this.currentSearchQuery || '').toLowerCase();

    const container = document.getElementById('auctionsGridContainer');
    if (!container) return;

    const filtered = this.auctions.filter(item => {
      const matchCat = (activeFilter === 'all') || (item.category === activeFilter);
      const matchSearch = !query || 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.sellerName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="glass-panel" style="grid-column: 1 / -1; padding: 48px; text-align: center; border-radius: 16px;">
          <div style="font-size: 2.5rem; margin-bottom: 12px;">🔍</div>
          <h3 style="color: #fff; font-size: 1.25rem; margin-bottom: 8px;">Tidak Ada Lelang Ditemukan</h3>
          <p style="color: #94a3b8; font-size: 0.9rem; max-width: 440px; margin: 0 auto 20px auto;">
            Tidak ditemukan barang lelang yang cocok dengan kata kunci pencarian Anda. Coba kata kunci lain atau reset filter.
          </p>
          <button class="btn btn-secondary" onclick="app.resetAuctionSearch()">Reset Pencarian</button>
        </div>
      `;
      return;
    }

    const currentActor = this.actors[this.currentRole];

    container.innerHTML = filtered.map(item => {
      const isSeller = (currentActor.address.toLowerCase() === item.sellerAddress.toLowerCase());
      const minNext = item.currentHighestBid + item.minIncrement;
      const fiatEst = (item.currentHighestBid * 45000000).toLocaleString('id-ID'); // 1 ETH ~ Rp 45M

      let actionButtonHtml = '';
      if (item.isFinalized) {
        actionButtonHtml = `
          <button class="btn btn-secondary btn-full" disabled>
            ✓ Lelang Selesai (Finalized)
          </button>
        `;
      } else if (isSeller) {
        actionButtonHtml = `
          <button class="btn btn-secondary btn-full" title="Aturan Bab 3.3.B: Penjual dilarang menawar lelang sendiri" disabled>
            🛡️ Barang Milik Anda (Anti-Shill)
          </button>
        `;
      } else if (this.currentRole === 'admin') {
        actionButtonHtml = `
          <button class="btn btn-warning btn-full" onclick="app.openAdminModal()">
            ⚙️ Panel Pengawasan Admin
          </button>
        `;
      } else if (this.currentRole === 'auditor') {
        actionButtonHtml = `
          <button class="btn btn-secondary btn-full" onclick="app.inspectAuctionContract(${item.id})">
            🔍 Audit State Kontrak
          </button>
        `;
      } else {
        actionButtonHtml = `
          <button class="btn btn-primary btn-full" onclick="app.openBidModal(${item.id})">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            Tawar Sekarang (placeBid)
          </button>
        `;
      }

      // Fast-forward demo button to finalize
      const finalizeBtn = (!item.isFinalized && (item.durationSeconds <= 60 || this.currentRole === 'admin' || isSeller)) ? `
        <button class="btn btn-ghost" style="font-size:0.75rem; padding: 4px 8px;" onclick="app.finalizeAuction(${item.id})" title="Panggil finalizeAuction() (Bab 3.4)">
          🏁 Finalisasi
        </button>
      ` : '';

      return `
        <article class="auction-card">
          <div class="card-media-wrapper">
            <img src="${item.image}" alt="${item.title}" class="auction-image" onerror="this.src='https://picsum.photos/seed/nft${item.id}/600/450'">
            <div class="card-top-badges">
              <span class="badge-live-pulse ${item.isFinalized ? 'ended' : ''}">
                <span class="live-dot"></span>
                ${item.isFinalized ? 'LELANG SELESAI' : 'LELANG BERJALAN'}
              </span>
              <span class="badge-asset-type">${item.category.toUpperCase()}</span>
            </div>
            <div class="card-countdown-overlay">
              <span class="countdown-label">Batas Waktu:</span>
              <span class="countdown-timer" id="timer-item-${item.id}">
                ${this.formatSeconds(item.durationSeconds)}
              </span>
            </div>
          </div>

          <div class="card-content-area">
            <h3 class="card-item-title">${item.title}</h3>
            <div class="contract-id-row">
              <span class="contract-tag">Contract</span>
              <span>${item.contractAddress.slice(0, 6)}...${item.contractAddress.slice(-4)}</span>
              <span title="Penjual: ${item.sellerName}">• Penjual: ${item.sellerName.split(' ')[0]}</span>
            </div>

            <div class="bidding-stats-box">
              <div class="price-row-current">
                <span class="price-label">Tawaran Tertinggi:</span>
                <span class="price-value-eth">${item.currentHighestBid.toFixed(2)} ETH</span>
              </div>
              <div class="price-value-fiat">≈ Rp ${fiatEst}</div>

              <div class="bidder-info-row">
                <span>Penawar Teratas:</span>
                <span class="highest-bidder-addr">${item.highestBidderAddress.slice(0, 6)}...${item.highestBidderAddress.slice(-4)} (${item.highestBidderName.split(' ')[0]})</span>
              </div>
              <div class="bidder-info-row" style="border:none; padding-top:4px;">
                <span>Min Kenaikan:</span>
                <span class="text-cyan">+${item.minIncrement.toFixed(2)} ETH (Batas Min: ${minNext.toFixed(2)} ETH)</span>
              </div>
            </div>

            <div class="card-actions-row">
              ${actionButtonHtml}
              ${finalizeBtn}
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  filterAuctions(category, buttonEl) {
    document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    if (buttonEl) buttonEl.classList.add('active');
    this.renderAuctionsGrid(category);
  }

  startCountdownTimer() {
    setInterval(() => {
      this.auctions.forEach(item => {
        if (!item.isFinalized && item.durationSeconds > 0) {
          item.durationSeconds -= 1;
          const el = document.getElementById(`timer-item-${item.id}`);
          if (el) el.innerText = this.formatSeconds(item.durationSeconds);
          if (item.id === 1) {
            const heroTimer = document.getElementById('heroCountdownTimer');
            if (heroTimer) heroTimer.innerText = this.formatSeconds(item.durationSeconds);
          }
        } else if (!item.isFinalized && item.durationSeconds <= 0) {
          item.durationSeconds = 0;
          const el = document.getElementById(`timer-item-${item.id}`);
          if (el) el.innerText = 'Waktu Habis (Siap Finalisasi)';
          if (item.id === 1) {
            const heroTimer = document.getElementById('heroCountdownTimer');
            if (heroTimer) heroTimer.innerText = 'Waktu Habis';
          }
        }
      });
    }, 1000);
  }

  formatSeconds(secs) {
    if (secs <= 0) return '00:00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // ==========================================
  // PLACE BID MODAL & LOGIC (Bab 3.3.B)
  // ==========================================
  openBidModal(auctionId) {
    const item = this.auctions.find(a => a.id === auctionId);
    if (!item) return;

    this.selectedAuctionForBid = item;
    const currentActor = this.actors[this.currentRole];

    // Check circuit breaker pause
    if (this.isCircuitPaused) {
      alert('⚠️ Sistem lelang sedang DIHENTIKAN SEMENTARA (PAUSED) oleh Admin karena prosedur darurat!');
      return;
    }

    // Check KYC status (Bab 3.3.B: IF pengirim BELUM terverifikasi THEN transaksi ditolak)
    if (!this.userRegistry[currentActor.address]?.verified) {
      alert(`❌ Transaksi Ditolak oleh Smart Contract UserRegistry!\nAlamat dompet Anda (${currentActor.address.slice(0, 10)}...) belum lolos verifikasi KYC/Whitelist.`);
      return;
    }

    // Check anti-shill bidding (Bab 3.3.B: IF pengirim == penjual THEN transaksi ditolak)
    if (currentActor.address.toLowerCase() === item.sellerAddress.toLowerCase()) {
      alert('❌ Transaksi Ditolak!\nSmart contract memblokir tawaran dari penjual untuk mencegah manipulasi shill-bidding.');
      return;
    }

    // Populate modal fields
    document.getElementById('modalItemImage').src = item.image;
    document.getElementById('modalItemTitle').innerText = item.title;
    document.getElementById('modalItemContract').innerText = `Contract: ${item.contractAddress}`;
    document.getElementById('modalCurrentBid').innerText = `${item.currentHighestBid.toFixed(2)} ETH`;

    const minRequired = item.currentHighestBid + item.minIncrement;
    document.getElementById('modalMinBidRequirement').innerText = `≥ ${minRequired.toFixed(2)} ETH`;

    const input = document.getElementById('bidAmountInput');
    input.value = minRequired.toFixed(2);
    input.min = minRequired.toFixed(2);
    document.getElementById('txValueDisplay').innerText = `${minRequired.toFixed(2)} ETH`;
    document.getElementById('txTotalDisplay').innerText = `${(minRequired + 0.00185).toFixed(4)} ETH`;

    // Render Quick Bid Chips
    const chipsContainer = document.getElementById('quickBidChips');
    chipsContainer.innerHTML = `
      <button type="button" class="chip-btn" onclick="app.setBidQuickValue(${minRequired})">${minRequired.toFixed(2)} ETH (Min)</button>
      <button type="button" class="chip-btn" onclick="app.setBidQuickValue(${minRequired + item.minIncrement})">+${item.minIncrement} ETH</button>
      <button type="button" class="chip-btn" onclick="app.setBidQuickValue(${minRequired + (item.minIncrement * 2)})">+${item.minIncrement * 2} ETH</button>
    `;

    document.getElementById('bidModalOverlay').classList.add('active');
  }

  setBidQuickValue(val) {
    const input = document.getElementById('bidAmountInput');
    input.value = val.toFixed(2);
    document.getElementById('txValueDisplay').innerText = `${val.toFixed(2)} ETH`;
    document.getElementById('txTotalDisplay').innerText = `${(val + 0.00185).toFixed(4)} ETH`;
  }

  closeBidModal() {
    document.getElementById('bidModalOverlay').classList.remove('active');
    this.selectedAuctionForBid = null;
  }

  executePlaceBid() {
    const item = this.selectedAuctionForBid;
    if (!item) return;

    const inputVal = parseFloat(document.getElementById('bidAmountInput').value);
    const minRequired = item.currentHighestBid + item.minIncrement;

    if (isNaN(inputVal) || inputVal < minRequired) {
      alert(`❌ Nilai bid tidak mencukupi!\nMinimal penawaran saat ini adalah ${minRequired.toFixed(2)} ETH.`);
      return;
    }

    const currentActor = this.actors[this.currentRole];
    if (currentActor.balance < inputVal) {
      const topup = confirm(`❌ Saldo Sepolia ETH tidak mencukupi!\nSaldo Anda: ${currentActor.balance.toFixed(4)} ETH\nKebutuhan Penawaran: ${inputVal.toFixed(2)} ETH\n\nApakah Anda ingin mengisi +5.0 Sepolia Testnet ETH sekarang secara gratis untuk melanjutkan lelang?`);
      if (topup) {
        this.claimSepoliaEthFaucet();
      }
      return;
    }

    // Show spinner
    const btn = document.getElementById('btnConfirmPlaceBid');
    const spinner = document.getElementById('bidSpinner');
    btn.disabled = true;
    spinner.style.display = 'inline-block';

    setTimeout(() => {
      // 1. CHECKS-EFFECTS-INTERACTIONS:
      // If there was a previous highest bidder, credit their refund in saldoTarik (Pull Payment Pattern)
      const prevBidderAddr = item.highestBidderAddress;
      const prevBidAmount = item.currentHighestBid;

      if (prevBidderAddr && prevBidderAddr !== currentActor.address) {
        if (!this.saldoTarik[prevBidderAddr]) this.saldoTarik[prevBidderAddr] = 0;
        this.saldoTarik[prevBidderAddr] += prevBidAmount;
      }

      // Deduct balance from current actor
      currentActor.balance -= inputVal;

      // Update Item State
      item.currentHighestBid = inputVal;
      item.highestBidderAddress = currentActor.address;
      item.highestBidderName = currentActor.name;
      item.totalBids += 1;

      // Generate Tx Hash
      const mockTxHash = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

      // Prepend to item history
      item.bidHistory.unshift({
        bidder: `${currentActor.address.slice(0, 5)}...${currentActor.address.slice(-4)}`,
        amount: inputVal,
        time: 'Baru saja',
        tx: `${mockTxHash.slice(0, 6)}...${mockTxHash.slice(-4)}`
      });

      // Mine a new block and add event log
      this.currentBlockNumber += 1;
      this.recentBlocks.unshift({
        number: this.currentBlockNumber,
        txCount: Math.floor(Math.random() * 15) + 5,
        miner: '0x12a0...e391',
        time: 'Baru saja',
        gas: '42,100'
      });
      if (this.recentBlocks.length > 5) this.recentBlocks.pop();

      this.contractEvents.unshift({
        event: 'BidPlaced',
        contract: `Auction #${item.id}`,
        txHash: mockTxHash,
        bidder: `${currentActor.address.slice(0, 6)}...${currentActor.address.slice(-4)}`,
        value: `${inputVal.toFixed(2)} ETH`,
        time: 'Baru saja'
      });
      if (this.contractEvents.length > 8) this.contractEvents.pop();

      // Sync Hero Spotlight Item if Item #1
      if (item.id === 1) {
        const heroBidEl = document.getElementById('heroHighestBid');
        const heroFiatEl = document.getElementById('heroHighestFiat');
        if (heroBidEl) heroBidEl.innerText = `${inputVal.toFixed(2)} ETH`;
        if (heroFiatEl) heroFiatEl.innerText = `≈ Rp ${(inputVal * 45000000).toLocaleString('id-ID')}`;
      }

      // UI Updates
      btn.disabled = false;
      spinner.style.display = 'none';
      this.closeBidModal();
      this.renderRoleBanner();
      this.updateWalletButtonUI();
      this.renderAuctionsGrid();
      this.renderBlockchainFeeds();

      this.showToast(
        'Penawaran Berhasil Dicatat di Blockchain!',
        `Tx Hash: ${mockTxHash.slice(0, 10)}... | Block #${this.currentBlockNumber}`,
        mockTxHash
      );
    }, 700);
  }

  // ==========================================
  // FINALIZE AUCTION (Bab 3.4 Poin 5)
  // ==========================================
  finalizeAuction(auctionId) {
    const item = this.auctions.find(a => a.id === auctionId);
    if (!item) return;

    if (item.isFinalized) {
      alert('Lelang ini sudah pernah difinalisasi.');
      return;
    }

    const confirmFinalize = confirm(`Finalisasi lelang untuk "${item.title}"?\n\nSmart Contract akan mengeksekusi:\n1. Menetapkan ${item.highestBidderName} sebagai pemenang sah.\n2. Meneruskan ${item.currentHighestBid} ETH ke saldo tarik penjual (${item.sellerName}).\n3. Memancarkan event AuctionFinalized.`);
    if (!confirmFinalize) return;

    item.isFinalized = true;

    // Credit proceeds to seller's saldoTarik
    if (!this.saldoTarik[item.sellerAddress]) this.saldoTarik[item.sellerAddress] = 0;
    this.saldoTarik[item.sellerAddress] += item.currentHighestBid;

    // Blockchain log
    const mockTxHash = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    this.contractEvents.unshift({
      event: 'AuctionFinalized',
      contract: `Auction #${item.id}`,
      txHash: mockTxHash,
      bidder: `${item.highestBidderAddress.slice(0, 6)}...${item.highestBidderAddress.slice(-4)}`,
      value: `${item.currentHighestBid.toFixed(2)} ETH`,
      time: 'Baru saja'
    });

    this.renderAuctionsGrid();
    this.renderRoleBanner();
    this.renderBlockchainFeeds();

    this.showToast('Lelang Resmi Difinalisasi On-Chain!', `Pemenang: ${item.highestBidderName} (${item.currentHighestBid} ETH)`);
  }

  // ==========================================
  // PULL-PAYMENT REFUND MODAL & WITHDRAW (Bab 3.4 Poin 4 & 6)
  // ==========================================
  openRefundModal() {
    const currentActor = this.actors[this.currentRole];
    const balance = this.saldoTarik[currentActor.address] || 0;
    const fiatVal = (balance * 45000000).toLocaleString('id-ID');

    document.getElementById('modalRefundAmount').innerText = balance.toFixed(3);
    document.getElementById('modalRefundFiat').innerText = `≈ Rp ${fiatVal}`;

    const withdrawBtn = document.getElementById('btnExecuteWithdraw');
    if (balance <= 0) {
      withdrawBtn.disabled = true;
      withdrawBtn.innerText = 'Tidak Ada Saldo Tarik';
    } else {
      withdrawBtn.disabled = false;
      withdrawBtn.innerText = `Tarik ${balance.toFixed(3)} ETH ke Dompet`;
    }

    document.getElementById('refundModalOverlay').classList.add('active');
  }

  closeRefundModal() {
    document.getElementById('refundModalOverlay').classList.remove('active');
  }

  executeWithdraw() {
    const currentActor = this.actors[this.currentRole];
    const amount = this.saldoTarik[currentActor.address] || 0;

    if (amount <= 0) {
      alert('Tidak ada saldo pengembalian.');
      return;
    }

    // CHECKS-EFFECTS-INTERACTIONS PATTERN (Bab IV.2.4 & Bab III.4 Poin 4):
    // 1. Check: require(amount > 0)
    // 2. Effect: saldoTarik[msg.sender] = 0 (Internal state updated BEFORE interaction!)
    this.saldoTarik[currentActor.address] = 0;

    // 3. Interaction: Transfer ETH to wallet
    currentActor.balance += amount;

    // Log to explorer
    const mockTxHash = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    this.contractEvents.unshift({
      event: 'Withdrawn',
      contract: 'Auction Escrow',
      txHash: mockTxHash,
      bidder: `${currentActor.address.slice(0, 6)}...${currentActor.address.slice(-4)}`,
      value: `${amount.toFixed(3)} ETH`,
      time: 'Baru saja'
    });

    this.closeRefundModal();
    this.renderRoleBanner();
    this.renderBlockchainFeeds();

    this.showToast(
      'Penarikan Dana (withdraw()) Berhasil!',
      `${amount.toFixed(3)} ETH telah masuk ke saldo dompet Anda via Pull-Payment Escrow.`
    );
  }

  // ==========================================
  // CREATE AUCTION (AuctionFactory.createAuction)
  // ==========================================
  handleCreateAuction(event) {
    event.preventDefault();

    const currentActor = this.actors[this.currentRole];

    // Check verification
    if (!this.userRegistry[currentActor.address]?.verified) {
      alert(`❌ Penolakan Smart Contract:\nAlamat ${currentActor.address.slice(0, 10)}... belum terverifikasi di UserRegistry.`);
      return;
    }

    const title = document.getElementById('itemTitle').value;
    const category = document.getElementById('itemCategory').value;
    const startingPrice = parseFloat(document.getElementById('startingPrice').value);
    const minIncrement = parseFloat(document.getElementById('minIncrement').value);
    const duration = parseInt(document.getElementById('auctionDuration').value);
    const desc = document.getElementById('itemDescription').value;

    const presetImg = document.querySelector('input[name="imagePreset"]:checked')?.value || 'cyber_nft';
    const imageMap = {
      cyber_nft: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_cyber_nft_1792665992651.jpg',
      luxury_watch: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_luxury_watch_1792666006981.jpg',
      cyber_villa: '../../brain/3c1e782b-594c-4228-819f-d11b86c8946a/auction_cyber_villa_1792666023584.jpg'
    };

    const newAuctionAddr = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;

    const newAuction = {
      id: this.auctions.length + 1,
      title: title,
      category: category,
      contractAddress: newAuctionAddr,
      sellerAddress: currentActor.address,
      sellerName: currentActor.name,
      startingPrice: startingPrice,
      minIncrement: minIncrement,
      currentHighestBid: startingPrice,
      highestBidderAddress: '0x0000000000000000000000000000000000000000',
      highestBidderName: 'Belum Ada Penawar',
      totalBids: 0,
      durationSeconds: duration,
      image: imageMap[presetImg] || imageMap.cyber_nft,
      description: desc,
      isFinalized: false,
      bidHistory: []
    };

    this.auctions.unshift(newAuction);

    // Event emitted: AuctionCreated
    const mockTxHash = `0x${Array.from({length: 40}, () => Math.floor(Math.random()*16).toString(16)).join('')}`;
    this.contractEvents.unshift({
      event: 'AuctionCreated',
      contract: 'AuctionFactory',
      txHash: mockTxHash,
      bidder: `${currentActor.address.slice(0, 6)}...${currentActor.address.slice(-4)}`,
      value: `${startingPrice.toFixed(2)} ETH`,
      time: 'Baru saja'
    });

    document.getElementById('statActiveAuctions').innerText = `${this.auctions.length} Kontrak`;
    document.getElementById('inspectorTotalAuctions').innerText = this.auctions.length;

    this.showToast('Lelang Baru Berhasil Diterbitkan!', `Kontrak: ${newAuctionAddr.slice(0, 10)}... (AuctionCreated)`);

    // Switch to catalog
    this.switchTab('auctions');
    this.renderAuctionsGrid();
    this.renderBlockchainFeeds();
  }

  // ==========================================
  // ADMIN PANEL / KYC MANAGEMENT (Bab II Poin 3)
  // ==========================================
  openAdminModal() {
    this.renderKycTable();
    document.getElementById('adminModalOverlay').classList.add('active');
  }

  closeAdminModal() {
    document.getElementById('adminModalOverlay').classList.remove('active');
  }

  renderKycTable() {
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;

    tbody.innerHTML = Object.entries(this.userRegistry).map(([addr, data]) => {
      return `
        <tr>
          <td><code class="text-cyan">${addr.slice(0, 8)}...${addr.slice(-6)}</code></td>
          <td>${data.name}</td>
          <td>
            <span class="kyc-badge ${data.verified ? 'verified' : 'pending'}">
              ${data.verified ? 'TERVERIFIKASI' : 'BELUM TERVERIFIKASI'}
            </span>
          </td>
          <td>
            <button class="btn btn-ghost" style="padding:2px 8px; font-size:0.7rem;" onclick="app.toggleKycStatus('${addr}')">
              ${data.verified ? 'Cabut Akses' : 'Verifikasi'}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  toggleKycStatus(addr) {
    if (this.userRegistry[addr]) {
      this.userRegistry[addr].verified = !this.userRegistry[addr].verified;
      this.renderKycTable();
      this.renderRoleBanner();
      this.showToast('UserRegistry Diperbarui', `Status alamat ${addr.slice(0, 8)}... diubah.`);
    }
  }

  addAddressToWhitelist() {
    const input = document.getElementById('newWhitelistInput');
    const addr = input.value.trim();
    if (!addr || !addr.startsWith('0x') || addr.length < 10) {
      alert('Format alamat wallet tidak valid. Harus diawali 0x...');
      return;
    }

    this.userRegistry[addr] = {
      name: 'Peserta Baru Terverifikasi',
      verified: true,
      time: 'Baru saja'
    };

    input.value = '';
    this.renderKycTable();
    this.showToast('Alamat Ditambahkan ke Whitelist', `${addr.slice(0, 10)}... resmi diverifikasi.`);
  }

  toggleEmergencyPause() {
    this.isCircuitPaused = !this.isCircuitPaused;
    const btn = document.getElementById('btnTogglePause');
    const inspectorStatus = document.getElementById('inspectorPauseStatus');

    if (this.isCircuitPaused) {
      btn.innerText = 'Lanjutkan Operasi (Unpause)';
      btn.className = 'btn btn-primary';
      inspectorStatus.innerText = 'true (PAUSED - Emergency)';
      inspectorStatus.className = 'var-val text-amber';
      this.showToast('CIRCUIT BREAKER DIAKTIFKAN', 'Seluruh lelang dijeda sementara demi keamanan.');
    } else {
      btn.innerText = 'Jeda Darurat (Pause)';
      btn.className = 'btn btn-warning';
      inspectorStatus.innerText = 'false (Normal Operation)';
      inspectorStatus.className = 'var-val text-success';
      this.showToast('Operasi Normal Dipulihkan', 'Kontrak lelang aktif kembali.');
    }
  }

  // ==========================================
  // SMART CONTRACT VIEWER (Bab III)
  // ==========================================
  switchContractCode(contractKey, btnEl) {
    if (btnEl) {
      document.querySelectorAll('.c-tab-btn').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }

    const data = this.smartContracts[contractKey];
    if (!data) return;

    document.getElementById('contractFilename').innerText = data.filename;
    document.getElementById('codeDisplayArea').innerText = data.code;

    // Render metadata
    const metaContainer = document.getElementById('contractMetaInfo');
    if (metaContainer) {
      metaContainer.innerHTML = `
        <div class="meta-field">
          <span class="k">Tipe Kontrak:</span>
          <span class="v">${data.type}</span>
        </div>
        <div class="meta-field">
          <span class="k">Deskripsi Singkat:</span>
          <span class="v" style="font-family:var(--font-sans); color:#cbd5e1; font-size:0.78rem;">${data.description}</span>
        </div>
        <div class="meta-field">
          <span class="k">Fungsi Utama:</span>
          <span class="v">${data.functions.join('<br>')}</span>
        </div>
        <div class="meta-field">
          <span class="k">Event Logs:</span>
          <span class="v">${data.events.join('<br>')}</span>
        </div>
      `;
    }
  }

  copyActiveCode() {
    const code = document.getElementById('codeDisplayArea').innerText;
    navigator.clipboard.writeText(code).then(() => {
      this.showToast('Kode Disalin ke Clipboard', 'Anda dapat paste ke Remix IDE atau Hardhat.');
    });
  }

  // ==========================================
  // VERISCAN BLOCKCHAIN EXPLORER (Bab II.2 Auditor)
  // ==========================================
  renderBlockchainFeeds() {
    const blocksList = document.getElementById('blocksFeedList');
    if (blocksList) {
      blocksList.innerHTML = this.recentBlocks.map(b => `
        <div class="block-row-item">
          <div class="block-left">
            <div class="block-icon-square">#${b.number.toString().slice(-3)}</div>
            <div class="block-info">
              <span class="block-num">Blok #${b.number}</span>
              <span class="block-time">${b.time} • Miner: ${b.miner}</span>
            </div>
          </div>
          <div class="block-right">
            <span class="miner-addr">${b.txCount} Transaksi</span>
            <span class="block-txs">Gas: ${b.gas}</span>
          </div>
        </div>
      `).join('');
    }

    const eventsList = document.getElementById('eventsFeedList');
    if (eventsList) {
      eventsList.innerHTML = this.contractEvents.map(ev => `
        <div class="event-row-item">
          <div class="event-left">
            <div class="event-icon-square">⚡</div>
            <div class="event-info">
              <span class="event-name">${ev.event}</span>
              <span class="event-detail">${ev.contract} • Dari: ${ev.bidder}</span>
            </div>
          </div>
          <div class="event-right">
            <span class="tx-hash">${ev.txHash.slice(0, 10)}...</span>
            <span class="event-gas">${ev.value} (${ev.time})</span>
          </div>
        </div>
      `).join('');
    }
  }

  searchExplorer() {
    const query = document.getElementById('explorerSearchInput').value.trim();
    if (!query) return;

    alert(`🔍 VeriScan Query:\nPencarian untuk "${query}" ditemukan pada Sepolia Testnet State Cache.`);
  }

  inspectAuctionContract(auctionId) {
    const item = this.auctions.find(a => a.id === auctionId);
    if (!item) return;

    alert(`🔍 Auditor Inspection Report (Read-Only):\n\nNama Aset: ${item.title}\nAlamat Kontrak: ${item.contractAddress}\nPenjual: ${item.sellerName} (${item.sellerAddress})\nPenawar Tertinggi: ${item.highestBidderName} (${item.currentHighestBid} ETH)\nTotal Bid Tercatat: ${item.totalBids} transaksi\nStatus Escrow: Aman (Checks-Effects-Interactions)\nEvent Log Hash: QmZtm...88A`);
  }

  // ==========================================
  // TOAST NOTIFICATION
  // ==========================================
  showToast(title, msg, txHash = null) {
    const toast = document.getElementById('txToast');
    document.getElementById('txToastTitle').innerText = title;
    document.getElementById('txToastMsg').innerText = msg;

    const link = document.getElementById('txToastLink');
    if (txHash) {
      link.style.display = 'block';
      link.innerText = `Lihat di VeriScan: ${txHash.slice(0, 10)}...`;
    } else {
      link.style.display = 'none';
    }

    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 4500);
  }

  openTxInExplorer(e) {
    e.preventDefault();
    this.switchTab('explorer');
  }

  toggleWalletModal() {
    const actor = this.actors[this.currentRole];
    alert(`🦊 MetaMask Wallet State:\n\nNama: ${actor.name}\nAlamat: ${actor.address}\nSaldo: ${actor.balance.toFixed(4)} Sepolia ETH\nStatus KYC: ${this.userRegistry[actor.address]?.verified ? 'TERVERIFIKASI' : 'BELUM'}\n\nGunakan dropdown 'Peran Aktif' atau tombol 'Login' di navbar atas untuk berganti antar aktor lelang!`);
  }

  // ==========================================
  // LOGIN & AUTHENTICATION MODAL (Menu Atas)
  // ==========================================
  openLoginModal() {
    const overlay = document.getElementById('loginModalOverlay');
    if (overlay) {
      overlay.classList.add('active');
      this.updateLoginModalActiveUser();
    }
  }

  closeLoginModal() {
    const overlay = document.getElementById('loginModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  switchLoginTab(tabKey) {
    const tabMap = {
      role: { btn: 'tabLoginRole', pane: 'loginPaneRole' },
      web3: { btn: 'tabLoginWeb3', pane: 'loginPaneWeb3' },
      email: { btn: 'tabLoginEmail', pane: 'loginPaneEmail' }
    };

    Object.keys(tabMap).forEach(key => {
      const isTarget = (key === tabKey);
      const b = document.getElementById(tabMap[key].btn);
      const p = document.getElementById(tabMap[key].pane);
      if (b) b.classList.toggle('active', isTarget);
      if (p) p.classList.toggle('active', isTarget);
    });
  }

  selectLoginActor(roleKey) {
    const actor = this.actors[roleKey];
    if (!actor) return;

    this.setActorRole(roleKey);
    const selectEl = document.getElementById('actorSelector');
    if (selectEl) selectEl.value = roleKey;

    this.closeLoginModal();
    this.showToast(`Berhasil Masuk: ${actor.name}`, `Peran aktif: ${actor.roleTitle}`);
  }

  async checkExistingWeb3Connection() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          await this.connectSepoliaWallet(true);
        }
      } catch (e) {
        console.warn('Silent connect check failed:', e);
      }
    }
  }

  async connectWeb3Wallet(walletProvider) {
    this.closeLoginModal();
    await this.selectWalletAndConnect(walletProvider);
  }

  async connectSepoliaWallet(isSilent = false) {
    if (typeof window.ethereum !== 'undefined') {
      try {
        if (!isSilent) {
          this.showToast('Menghubungkan Dompet...', 'Membuka MetaMask / Web3 Provider...');
        }

        // Request user accounts
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          if (!isSilent) this.showToast('Gagal Terhubung', 'Tidak ada akun yang dipilih.');
          return;
        }

        // Verify & switch chain to Ethereum Sepolia (0xaa36a7 / 11155111)
        let currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (currentChainId !== this.sepoliaChainIdHex) {
          if (!isSilent) {
            this.showToast('Memeriksa Jaringan...', 'Mengalihkan jaringan ke Sepolia Testnet (11155111)...');
          }
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: this.sepoliaChainIdHex }]
            });
            currentChainId = this.sepoliaChainIdHex;
          } catch (switchError) {
            // 4902: Unrecognized chain
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: this.sepoliaChainIdHex,
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: ['https://ethereum-sepolia.publicnode.com', 'https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
              });
              currentChainId = this.sepoliaChainIdHex;
            } else {
              throw switchError;
            }
          }
        }

        const selectedAccount = accounts[0];
        let balanceEth = '0.0000';
        try {
          const balanceHex = await window.ethereum.request({
            method: 'eth_getBalance',
            params: [selectedAccount, 'latest']
          });
          balanceEth = (parseInt(balanceHex, 16) / 1e18).toFixed(4);
        } catch (e) {
          console.warn('Could not fetch balance from RPC:', e);
        }

        this.isWalletConnected = true;
        this.web3Connected = true;
        this.web3Account = selectedAccount;
        this.web3ChainId = currentChainId;
        this.web3Balance = balanceEth;

        // Register Web3 Actor
        this.actors.web3 = {
          id: 'web3',
          name: `Sepolia User (${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)})`,
          address: selectedAccount,
          balance: parseFloat(balanceEth) || 0.5,
          isVerified: true,
          roleTitle: 'Akun Web3 Asli (Sepolia)',
          desc: 'Terhubung langsung ke dompet Ethereum Sepolia Testnet via Web3 Provider.'
        };
        this.userRegistry[selectedAccount] = {
          verified: true,
          name: 'Web3 Sepolia User',
          email: 'web3@sepolia.eth',
          phone: '+62-WEB3',
          nikHash: '0x' + selectedAccount.slice(2, 34)
        };
        this.currentRole = 'web3';

        // Add to actorSelector dropdown
        const actorSelector = document.getElementById('actorSelector');
        if (actorSelector && !document.getElementById('optWeb3Account')) {
          const opt = document.createElement('option');
          opt.id = 'optWeb3Account';
          opt.value = 'web3';
          opt.innerText = `🦊 Dompet Sepolia: ${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)}`;
          actorSelector.insertBefore(opt, actorSelector.firstChild);
        }
        if (actorSelector) actorSelector.value = 'web3';

        this.updateWalletButtonUI();
        this.updateVbidDisplays();
        this.renderRoleBanner();
        this.closeLoginModal();
        this.closeNoWeb3Modal();

        if (!isSilent) {
          this.showToast('🎉 Dompet Sepolia Terhubung!', `Alamat: ${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)} | Saldo: ${balanceEth} Sepolia ETH`);
        }

        // Setup Event Listeners
        if (!this.web3ListenersSet) {
          this.web3ListenersSet = true;
          window.ethereum.on('accountsChanged', (newAccounts) => {
            if (!newAccounts || newAccounts.length === 0) {
              this.disconnectWallet();
            } else {
              this.connectSepoliaWallet(true);
            }
          });
          window.ethereum.on('chainChanged', () => {
            window.location.reload();
          });
        }

      } catch (err) {
        console.error('Wallet connect error:', err);
        if (!isSilent) {
          this.showToast('Gagal Menghubungkan', err.message || 'Koneksi ke dompet dibatalkan.');
        }
      }
    } else {
      if (!isSilent) {
        this.openNoWeb3Modal();
      }
    }
  }

  connectSimulatedSepoliaWallet() {
    const demoAddr = '0x71C84920A1b2F890D028481B2719B5aCdE39B2';
    this.isWalletConnected = true;
    this.web3Connected = true;
    this.web3Account = demoAddr;
    this.web3Balance = '14.8500';
    this.web3ChainId = this.sepoliaChainIdHex;

    this.actors.web3 = {
      id: 'web3',
      name: `Sepolia Demo User (${demoAddr.slice(0, 6)}...${demoAddr.slice(-4)})`,
      address: demoAddr,
      balance: 14.85,
      isVerified: true,
      roleTitle: 'Akun Simulasi Sepolia',
      desc: 'Mode simulasi terhubung ke Sepolia Testnet dengan faucet otomatis.'
    };
    this.userRegistry[demoAddr] = {
      verified: true,
      name: 'Sepolia Demo User',
      email: 'demo@sepolia.eth',
      phone: '+62-DEMO',
      nikHash: '0x' + demoAddr.slice(2, 34)
    };
    this.currentRole = 'web3';

    // Add to actor selector
    const actorSelector = document.getElementById('actorSelector');
    if (actorSelector && !document.getElementById('optWeb3Account')) {
      const opt = document.createElement('option');
      opt.id = 'optWeb3Account';
      opt.value = 'web3';
      opt.innerText = `🦊 Mode Sepolia: ${demoAddr.slice(0, 6)}...${demoAddr.slice(-4)}`;
      actorSelector.insertBefore(opt, actorSelector.firstChild);
    }
    if (actorSelector) actorSelector.value = 'web3';

    this.updateWalletButtonUI();
    this.updateVbidDisplays();
    this.renderRoleBanner();
    this.closeNoWeb3Modal();
    this.closeLoginModal();

    this.showToast('⚡ Mode Sepolia Aktif!', `Terhubung ke Sepolia Testnet: 14.85 Sepolia ETH & ${this.vbidBalance} $VBID.`);
  }

  disconnectWallet() {
    this.isWalletConnected = false;
    this.web3Connected = false;
    this.web3Account = null;
    this.web3Balance = '0.0000';
    this.currentRole = 'bidder';

    const actorSelector = document.getElementById('actorSelector');
    if (actorSelector) {
      const opt = document.getElementById('optWeb3Account');
      if (opt) opt.remove();
      actorSelector.value = 'bidder';
    }

    this.updateWalletButtonUI();
    this.renderRoleBanner();
    this.closeWalletModal();
    this.showToast('Dompet Terputus', 'Sesi dompet Web3 telah ditutup.');
  }

  openWalletModal() {
    const actor = this.actors[this.currentRole];
    const addr = this.web3Account || actor.address;
    const balance = this.web3Connected ? this.web3Balance : actor.balance.toFixed(4);

    const addrEl = document.getElementById('modalWalletAddressFull');
    if (addrEl) addrEl.innerText = addr;

    const ethBalEl = document.getElementById('modalWalletEthBalance');
    if (ethBalEl) ethBalEl.innerText = `${balance} ETH`;

    const ethFiatEl = document.getElementById('modalWalletEthFiat');
    if (ethFiatEl) {
      const fiat = (parseFloat(balance) * 45000000).toLocaleString('id-ID');
      ethFiatEl.innerText = `≈ Rp ${fiat}`;
    }

    const vbidBalEl = document.getElementById('modalWalletVbidBalance');
    if (vbidBalEl) vbidBalEl.innerText = `${this.vbidBalance.toLocaleString()} VBID`;

    const etherscanLink = document.getElementById('modalEtherscanLink');
    if (etherscanLink) {
      etherscanLink.href = `https://sepolia.etherscan.io/address/${addr}`;
    }

    const overlay = document.getElementById('walletModalOverlay');
    if (overlay) overlay.classList.add('active');
  }

  closeWalletModal() {
    const overlay = document.getElementById('walletModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  async switchWalletAccount() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        this.showToast('Ganti Akun MetaMask', 'Membuka jendela pemilihan akun MetaMask...');
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
        await this.connectSepoliaWallet(false);
      } catch (err) {
        console.warn('Switch account cancelled or failed:', err);
      }
    } else {
      this.openNoWeb3Modal();
    }
  }

  claimSepoliaEthFaucet() {
    const actor = this.actors[this.currentRole];
    if (!actor) return;
    actor.balance = (actor.balance || 0) + 5.0;
    if (this.web3Connected) {
      this.web3Balance = actor.balance.toFixed(4);
    }
    const ethBalEl = document.getElementById('modalWalletEthBalance');
    if (ethBalEl) ethBalEl.innerText = `${actor.balance.toFixed(4)} ETH`;
    const ethFiatEl = document.getElementById('modalWalletEthFiat');
    if (ethFiatEl) {
      const fiat = (actor.balance * 45000000).toLocaleString('id-ID');
      ethFiatEl.innerText = `≈ Rp ${fiat}`;
    }
    this.updateWalletButtonUI();
    this.showToast('💧 Faucet Sepolia ETH Diberikan', `Saldo uji coba +5.0000 ETH berhasil ditambahkan ke akun Anda! Total Saldo: ${actor.balance.toFixed(4)} ETH.`);
  }

  openConnectWalletModal() {
    const overlay = document.getElementById('connectWalletModalOverlay');
    if (overlay) {
      overlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  closeConnectWalletModal() {
    const overlay = document.getElementById('connectWalletModalOverlay');
    if (overlay) {
      overlay.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  toggleMoreWallets() {
    const list = document.getElementById('extraWalletsList');
    const chevron = document.getElementById('moreWalletsChevron');
    const label = document.querySelector('.more-wallets-label');
    if (!list) return;
    if (list.style.display === 'none' || !list.style.display) {
      list.style.display = 'flex';
      if (label) label.classList.add('open');
      if (chevron) chevron.style.transform = 'rotate(90deg)';
    } else {
      list.style.display = 'none';
      if (label) label.classList.remove('open');
      if (chevron) chevron.style.transform = 'rotate(0deg)';
    }
  }

  async selectWalletAndConnect(walletName) {
    this.closeConnectWalletModal();

    if (walletName === 'Simulated Demo') {
      this.connectSimulatedSepoliaWallet();
      return;
    }

    if (walletName === 'WalletConnect') {
      this.showToast('WalletConnect', 'Membuka QR Code sesi WalletConnect ke Ethereum Sepolia...');
      if (typeof window.ethereum !== 'undefined') {
        await this.connectSepoliaWallet(false);
      } else {
        setTimeout(() => {
          this.connectSimulatedSepoliaWallet();
        }, 500);
      }
      return;
    }

    // Direct Web3 connection targeting Ethereum Sepolia Testnet
    if (typeof window.ethereum !== 'undefined') {
      this.showToast(`Menghubungkan ke ${walletName}...`, 'Meminta otorisasi dompet di jaringan Sepolia Testnet...');
      await this.connectSepoliaWallet(false);
    } else {
      // Injected provider not available: show fallback modal with install MetaMask link or instant simulation
      this.openNoWeb3Modal();
    }
  }

  handleSocialLoginClick() {
    this.closeConnectWalletModal();
    this.showToast('Social Web3Auth', 'Menginisialisasi sesi Web3Auth MPC via Google / X di Sepolia...');
    setTimeout(() => {
      this.connectSimulatedSepoliaWallet();
    }, 450);
  }

  showWalletGuide() {
    this.showToast('Panduan Dompet Kripto', 'Gunakan MetaMask atau Trust Wallet di browser untuk bertransaksi aman di Ethereum Sepolia Testnet.');
  }

  showDisclaimer() {
    alert('Disclaimer VeriBid: Platform lelang terdesentralisasi beroperasi di Ethereum Sepolia Testnet. Kunci privat Anda tersimpan aman secara lokal di dompet Anda dan tidak pernah dikirimkan ke pihak ketiga.');
  }

  openNoWeb3Modal() {
    const overlay = document.getElementById('noWeb3ModalOverlay');
    if (overlay) overlay.classList.add('active');
  }

  closeNoWeb3Modal() {
    const overlay = document.getElementById('noWeb3ModalOverlay');
    if (overlay) overlay.classList.remove('active');
  }

  async switchOrCheckSepolia() {
    if (typeof window.ethereum !== 'undefined') {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: this.sepoliaChainIdHex }]
        });
        this.showToast('Jaringan: Sepolia', 'Dompet terhubung ke Ethereum Sepolia Testnet (Chain ID 11155111).');
      } catch (e) {
        if (e.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: this.sepoliaChainIdHex,
                chainName: 'Sepolia Testnet',
                nativeCurrency: { name: 'Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
                blockExplorerUrls: ['https://sepolia.etherscan.io']
              }]
            });
          } catch (err) {
            console.error(err);
          }
        }
      }
    } else {
      this.showToast('Ethereum Sepolia', 'Jaringan aktif platform: Sepolia Testnet (Chain ID: 11155111).');
    }
  }

  claimVbidFaucet() {
    this.vbidBalance += 500;
    this.updateVbidDisplays();
    this.showToast('🎁 Faucet $VBID Berhasil Diklaim!', `+500 $VBID telah ditambahkan ke dompet Anda di Sepolia. Total Saldo: ${this.vbidBalance.toLocaleString()} $VBID`);
  }

  updateVbidDisplays() {
    const el1 = document.getElementById('tokenomicsUserBalance');
    if (el1) el1.innerText = `Saldo Anda: ${this.vbidBalance.toLocaleString()} $VBID`;

    const el2 = document.getElementById('modalWalletVbidBalance');
    if (el2) el2.innerText = `${this.vbidBalance.toLocaleString()} VBID`;
  }

  copyTokenContract() {
    const contract = '0x71C8A184243229b4B283a0056637e6F1f3B514f7';
    navigator.clipboard.writeText(contract).then(() => {
      this.showToast('Tersalin!', `Contract Address $VBID (${contract.slice(0, 10)}...) disalin ke clipboard.`);
    }).catch(() => {
      prompt('Salin alamat smart contract token $VBID:', contract);
    });
  }

  copyWalletAddress() {
    const actor = this.actors[this.currentRole];
    const addr = this.web3Account || actor.address;
    navigator.clipboard.writeText(addr).then(() => {
      this.showToast('Tersalin!', `Alamat dompet ${addr.slice(0, 10)}... disalin ke clipboard.`);
    }).catch(() => {
      prompt('Salin alamat dompet:', addr);
    });
  }

  handleEmailLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmailInput').value;
    const actor = this.actors[this.currentRole];
    this.updateLoginButtonUI(actor.name, true);
    this.closeLoginModal();
    this.showToast('Login Berhasil!', `Selamat datang kembali, ${email}! Sesi Anda telah aktif.`);
  }

  handleLogout() {
    const confirmLogout = confirm('Keluar dari sesi saat ini? Anda dapat masuk kembali kapan saja.');
    if (!confirmLogout) return;

    const navText = document.getElementById('navLoginText');
    if (navText) navText.innerText = 'Login';
    const dot = document.getElementById('loginStatusDot');
    if (dot) {
      dot.classList.remove('online');
      dot.classList.add('offline');
    }
    const sessionName = document.getElementById('sessionUserName');
    if (sessionName) sessionName.innerText = 'Mode Tamu (Belum Login)';

    this.closeLoginModal();
    this.showToast('Anda Telah Keluar', 'Klik tombol "Login" di navbar atas untuk masuk kembali.');
  }

  updateLoginButtonUI(name, isLoggedIn) {
    const navText = document.getElementById('navLoginText');
    if (navText) {
      navText.innerText = isLoggedIn ? (name ? name.split(' ')[0] : 'Akun') : 'Login';
    }
    const dot = document.getElementById('loginStatusDot');
    if (dot) {
      dot.classList.toggle('online', isLoggedIn);
      dot.classList.toggle('offline', !isLoggedIn);
    }
  }

  updateLoginModalActiveUser() {
    const actor = this.actors[this.currentRole];
    const nameEl = document.getElementById('sessionUserName');
    const addrEl = document.getElementById('sessionUserAddr');
    if (nameEl && actor) nameEl.innerText = `${actor.name}`;
    if (addrEl && actor) addrEl.innerText = `${actor.address.slice(0, 10)}...${actor.address.slice(-6)}`;
  }

  scrollToAuctions(e) {
    if (e) e.preventDefault();
    const target = document.querySelector('.auction-filter-bar') || document.getElementById('auctionsGridContainer');
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// Global instance initiation
const app = new VeriBidApp();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
