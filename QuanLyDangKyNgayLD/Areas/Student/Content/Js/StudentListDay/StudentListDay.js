// Mapping khu vực -> ảnh
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

fetch("/Student/StudentListDay/GetLichDaDuyet")
    .then(res => res.json())
    .then(data => {
        if (data.success && data.list) {
            data.list.forEach(item => {
                const parts = item.Ngay.split('/');
                const dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
                const day = dateObj.getDay(); // 0 = CN, 1 = T2, ..., 6 = T7

                let cellId = "";
                const buoi = item.Buoi?.toLowerCase();

                if (buoi === "sáng") cellId = `sang${day === 0 ? "CN" : day}`;
                else if (buoi === "chiều") cellId = `chieu${day === 0 ? "CN" : day}`;
                else return; // bỏ qua buổi tối

                if (cellId) {
                    const cell = document.getElementById(cellId);
                    if (cell) {
                        cell.innerHTML = `
                            <button class="btn btn-sm btn-success" onclick='showChiTiet(${JSON.stringify(item)})'>
                                Xem chi tiết
                            </button>`;
                    }
                }
            });
        }
    })
    .catch(err => console.error("Lỗi tải lịch lao động:", err));

function showChiTiet(item) {
    document.getElementById("ctNgay").innerText = item.Ngay;
    document.getElementById("ctBuoi").innerText = item.Buoi;
    document.getElementById("ctLoai").innerText = item.LoaiLaoDong;
    document.getElementById("ctDiaDiem").innerText = item.DiaDiem;

    // Lấy ảnh theo khu vực
    const imgUrl = khuVucImages[item.DiaDiem] || "https://via.placeholder.com/400x200?text=No+Image";
    document.getElementById("ctHinh").src = imgUrl;

    new bootstrap.Modal(document.getElementById("modalChiTiet")).show();
}
