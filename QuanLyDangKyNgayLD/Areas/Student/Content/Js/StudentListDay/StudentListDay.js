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

            // ===== MÀU THEO TRẠNG THÁI =====
            let bgClass = "bg-light";
            switch (item.TrangThaiText?.trim()) {
                case "Đã duyệt":
                    bgClass = "bg-success text-white";
                    break;
                case "Chưa duyệt":
                    bgClass = "bg-warning";
                    break;
                case "Kết thúc":
                    bgClass = "bg-secondary text-white";
                    break;
                case "Hoàn thành":
                    bgClass = "bg-primary text-white";
                    break;
            }

            // ===== TẠO Ô HIỂN THỊ =====
            const div = document.createElement("div");
            div.className = `p-2 rounded ${bgClass}`;
            div.style.cursor = "pointer";
            div.innerHTML = `
                ${item.LoaiLaoDong} - ${item.DiaDiem}
                <br>
                <small>${item.TrangThaiText}</small>
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
    document.getElementById("ctNgay").innerText = item.Ngay;
    document.getElementById("ctBuoi").innerText = item.Buoi;
    document.getElementById("ctLoai").innerText = item.LoaiLaoDong;
    document.getElementById("ctDiaDiem").innerText = item.DiaDiem;
    document.getElementById("ctTrangThai").innerText = item.TrangThaiText;

    const imgUrl = khuVucImages[item.DiaDiem] || "https://via.placeholder.com/400x200?text=No+Image";
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
