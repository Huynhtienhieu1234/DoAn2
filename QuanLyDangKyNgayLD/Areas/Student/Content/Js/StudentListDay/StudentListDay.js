// ==============================
// CẤU HÌNH HÌNH ẢNH KHU VỰC
// ==============================
const khuVucImages = {
    "A1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/1.jpg",
    "A2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/2.jpg",
    "B1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/3.jpg",
    "B2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/4.jpg",
    "B3": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/5.jpg",
    "B4": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/6.jpg",
    "C1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/7.jpg",
    "C2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/8.jpg",
    "H1": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/9.jpg",
    "H2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/10.jpg",
    "T2": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/11.jpg",
    "Trước cổng trường": "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/12.jpg"
};

// ==============================
// BIẾN TOÀN CỤC
// ==============================
let currentWeekOffset = 0;

// ==============================
// SET NGÀY THỰC TẾ CHO HEADER
// ==============================
function setNgayThucTe() {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Lấy thứ Hai của tuần hiện tại
    const monday = new Date(now);
    const diffToMonday = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - diffToMonday + currentWeekOffset * 7);

    // Điền ngày cho Thứ 2 → Chủ nhật
    for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);

        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();

        const id = (i === 6) ? "ngayCN" : "ngay" + (i + 2);
        document.getElementById(id).innerText = `${dd}/${mm}/${yyyy}`;
    }
}

// ==============================
// LOAD LỊCH ĐÃ ĐĂNG KÝ
// ==============================
function loadLich() {
    $.getJSON(`/Student/StudentListDay/GetLichDaDangKy?weekOffset=${currentWeekOffset}`, function (res) {
        if (!res.success || !res.list) return;

        // Clear dữ liệu cũ
        $("td[id^='sang'], td[id^='chieu']").html("");

        res.list.forEach(item => {

            // ===== PARSE NGÀY (AN TOÀN TIMEZONE) =====
            let d;
            if (item.Ngay.includes("-")) {
                d = new Date(item.Ngay + "T12:00:00");
            } else {
                const [dd, mm, yyyy] = item.Ngay.split("/");
                d = new Date(`${yyyy}-${mm}-${dd}T12:00:00`);
            }

            // ===== MAP THỨ → CỘT HTML =====
            const thu = d.getDay(); // 0=CN, 1=T2...
            let thuCol = (thu === 0) ? "CN" : (thu + 1);

            // ===== MAP BUỔI =====
            const buoi = item.Buoi?.toLowerCase();
            const prefix =
                buoi === "sáng" ? "sang" :
                    buoi === "chiều" ? "chieu" : null;

            if (!prefix) return;

            const cellId = prefix + thuCol;
            const cell = document.getElementById(cellId);
            if (!cell) return;

            // ===== MÀU THEO TRẠNG THÁI (ĐỒNG BỘ VỚI TRANG TẠO ĐỢT LAO ĐỘNG) =====
            let badgeHtml = "";
            let cardBorder = "border-secondary";
            switch (item.TrangThaiText?.trim()) {
                case "Đã duyệt":
                    cardBorder = "border-success";
                    badgeHtml = `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`;
                    break;
                case "Chưa duyệt":
                    cardBorder = "border-warning";
                    badgeHtml = `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;
                    break;
                case "Kết thúc":
                    cardBorder = "border-secondary";
                    badgeHtml = `<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Kết thúc</span>`;
                    break;
                case "Tạm ngưng":
                    cardBorder = "border-danger";
                    badgeHtml = `<span class="badge bg-danger"><i class="fas fa-pause-circle me-1"></i>Tạm ngưng</span>`;
                    break;
                case "Đã điểm danh":
                    cardBorder = "border-info";
                    badgeHtml = `<span class="badge bg-info text-white"><i class="fas fa-user-check me-1"></i>Đã điểm danh</span>`;
                    break;
                default:
                    cardBorder = "border-secondary";
                    badgeHtml = `<span class="badge bg-light text-dark">${item.TrangThaiText || ''}</span>`;
                    break;
            }

            // ===== TẠO Ô HIỂN THỊ =====
            const div = document.createElement("div");
            div.className = `p-2 mb-1 rounded-3 bg-white border ${cardBorder} shadow-sm text-start`;
            div.style.cursor = "pointer";
            div.style.transition = "all .2s ease";
            div.onmouseover = () => { div.style.transform = "translateY(-2px)"; div.style.boxShadow = "0 4px 10px rgba(0,0,0,0.12)"; };
            div.onmouseout = () => { div.style.transform = "none"; div.style.boxShadow = ""; };
            div.innerHTML = `
                <div class="fw-bold text-dark mb-1" style="font-size: 13px;">
                    <i class="fas fa-map-marker-alt text-danger me-1"></i>${item.LoaiLaoDong || ''} - ${item.DiaDiem || ''}
                </div>
                <div>${badgeHtml}</div>
            `;

            div.addEventListener("click", () => showChiTiet(item));

            cell.appendChild(div);
        });
    })
        .fail(() => console.error("Lỗi tải lịch lao động"));
}

// ==============================
// HIỂN THỊ CHI TIẾT
// ==============================
function showChiTiet(item) {
    document.getElementById("ctNgay").innerText = item.Ngay || "";
    document.getElementById("ctBuoi").innerText = item.Buoi || "";
    document.getElementById("ctLoai").innerText = item.LoaiLaoDong || "";
    document.getElementById("ctDiaDiem").innerText = item.DiaDiem || "";
    document.getElementById("ctTrangThai").innerText = item.TrangThaiText || "";

    const imgUrl = khuVucImages[item.DiaDiem] || "https://raw.githubusercontent.com/Huynhtienhieu1234/KhuVucLaoDong/main/1.jpg";
    document.getElementById("ctHinh").src = imgUrl;

    new bootstrap.Modal(document.getElementById("modalChiTiet")).show();
}

// ==============================
// ĐỔI TUẦN
// ==============================
function changeWeek(offset) {
    currentWeekOffset += offset;
    setNgayThucTe();
    loadLich();
}

// ==============================
// INIT
// ==============================
$(document).ready(function () {
    setNgayThucTe();
    loadLich();
});
