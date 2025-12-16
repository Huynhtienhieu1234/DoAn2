const MUC_TIEU = 18; // Mục tiêu 18 ngày

document.addEventListener("DOMContentLoaded", function () {

    // ================= LẤY CHI TIẾT NGÀY LAO ĐỘNG =================
    fetch("/Student/StudentTK/GetChiTietNgay")
        .then(res => res.json())
        .then(data => {
            const chiTietBody = document.getElementById("chiTietBody");
            const loadingChiTiet = document.getElementById("loadingChiTiet");

            if (loadingChiTiet) loadingChiTiet.style.display = "none";

            // Hết session
            if (data.message === "Phiên đăng nhập hết hạn.") {
                window.location.href = "/Login/Login";
                return;
            }

            // Có dữ liệu
            if (data.success && Array.isArray(data.list) && data.list.length > 0) {
                chiTietBody.innerHTML = data.list.map((item, index) => `
                    <tr>
                        <td>${index + 1}</td>
                        <td>${item.Buoi || ""}</td>
                        <td>${item.Ngay || ""}</td>
                        <td>${item.LoaiLaoDong || ""}</td>
                        <td>${item.DiaDiem || ""}</td>
                    </tr>
                `).join("");
            }
            // Không có dữ liệu
            else {
                chiTietBody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center text-muted py-4">
                            <i class="fas fa-info-circle fa-lg mb-2"></i><br />
                            Chưa có dữ liệu ngày lao động
                        </td>
                    </tr>
                `;
            }
        })
        .catch(err => {
            console.error("Lỗi tải chi tiết ngày lao động:", err);
            document.getElementById("chiTietBody").innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-danger py-4">
                        Lỗi kết nối máy chủ!
                    </td>
                </tr>
            `;
        });


    // ================= THỐNG KÊ (nếu bạn đang dùng) =================
    fetch("/Student/StudentTK/GetThongKe")
        .then(res => res.json())
        .then(data => {
            if (data.message === "Phiên đăng nhập hết hạn.") {
                window.location.href = "/Login/Login";
                return;
            }

            if (!data.success) return;

            document.getElementById("tongDot").innerText = data.tongDot;
            document.getElementById("daDuyet").innerText = data.daDuyet;
            document.getElementById("daDiemDanh").innerText = data.daDiemDanh;
            document.getElementById("hoanThanh").innerText = data.hoanThanh;

            const progressBar = document.getElementById("progressBar");
            const percent = Math.min((data.hoanThanh / MUC_TIEU) * 100, 100);
            progressBar.style.width = percent + "%";
            progressBar.innerText = `${data.hoanThanh} / ${MUC_TIEU} ngày`;
        })
        .catch(err => console.error("Lỗi thống kê:", err));

});
