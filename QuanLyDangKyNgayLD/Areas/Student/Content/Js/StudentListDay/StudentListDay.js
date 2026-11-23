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

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const rangeEl = document.getElementById("weekRangeText");
    if (rangeEl) {
        const start = `${String(monday.getDate()).padStart(2, "0")}/${String(monday.getMonth() + 1).padStart(2, "0")}`;
        const end = `${String(sunday.getDate()).padStart(2, "0")}/${String(sunday.getMonth() + 1).padStart(2, "0")}/${sunday.getFullYear()}`;
        rangeEl.textContent = `${start} - ${end}`;
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
            let cardState = "is-finished";
            switch (item.TrangThaiText?.trim()) {
                case "Đã duyệt":
                    cardState = "is-approved";
                    badgeHtml = `<span class="badge bg-success"><i class="fas fa-check-circle me-1"></i>Đã duyệt</span>`;
                    break;
                case "Chưa duyệt":
                    cardState = "is-pending";
                    badgeHtml = `<span class="badge bg-warning text-dark"><i class="fas fa-clock me-1"></i>Chưa duyệt</span>`;
                    break;
                case "Kết thúc":
                    cardState = "is-finished";
                    badgeHtml = `<span class="badge bg-secondary"><i class="fas fa-ban me-1"></i>Kết thúc</span>`;
                    break;
                case "Tạm ngưng":
                    cardState = "is-paused";
                    badgeHtml = `<span class="badge bg-danger"><i class="fas fa-pause-circle me-1"></i>Tạm ngưng</span>`;
                    break;
                case "Đã điểm danh":
                    cardState = "is-attended";
                    badgeHtml = `<span class="badge bg-info text-white"><i class="fas fa-user-check me-1"></i>Đã điểm danh</span>`;
                    break;
                default:
                    cardState = "is-finished";
                    badgeHtml = `<span class="badge bg-light text-dark">${item.TrangThaiText || ''}</span>`;
                    break;
            }

            // ===== TẠO Ô HIỂN THỊ =====
            const div = document.createElement("div");
            div.className = `student-schedule-event ${cardState}`;
            div.innerHTML = `
                <div class="student-schedule-event-title">
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
