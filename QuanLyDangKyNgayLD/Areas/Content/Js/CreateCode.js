// CreateCode.js - Chuyên xử lý điểm danh bằng mã cho Admin
// Hiển thị mã điểm danh + Xem danh sách sinh viên đã điểm danh

document.addEventListener("DOMContentLoaded", function () {
    // Gộp 2 listener thành 1 để tối ưu và dễ quản lý
    document.body.addEventListener("click", function (e) {
        // ==================== 1. NÚT HIỂN THỊ MÃ ĐIỂM DANH ====================
        const showCodeBtn = e.target.closest(".btn-show-code");
        if (showCodeBtn) {
            const dotId = showCodeBtn.dataset.id;

            fetch("/Admin/AdminWordRegister/HienThiMaDiemDanh", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
                },
                body: JSON.stringify({ dotId: parseInt(dotId) })
            })
                .then(response => {
                    if (!response.ok) throw new Error("Server error");
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        document.getElementById("maDiemDanhDisplay").textContent = data.maDiemDanh;
                        document.getElementById("tenDotHienThi").textContent = data.tenDot || "Không xác định";
                        new bootstrap.Modal(document.getElementById("maDiemDanhModal")).show();
                    } else {
                        showToast(data.message || "Không thể lấy mã điểm danh!", "error");
                    }
                })
                .catch(err => {
                    console.error("Lỗi hiển thị mã:", err);
                    showToast("Lỗi kết nối đến server!", "error");
                });
            return; // Dừng xử lý nếu đã click nút này
        }

        // ==================== 2. NÚT XEM DANH SÁCH ĐÃ ĐIỂM DANH ====================
        const viewAttendanceBtn = e.target.closest(".btn-view-attendance");
        if (viewAttendanceBtn) {
            const dotId = viewAttendanceBtn.dataset.id;

            const container = document.getElementById("dsDiemDanhTableContainer");
            const emptyMsg = document.getElementById("dsDiemDanhEmpty");
            const tbody = document.getElementById("dsDiemDanhBody");

            // Reset trạng thái
            container.style.display = "none";
            emptyMsg.style.display = "block";

            fetch(`/Admin/AdminWordRegister/GetDanhSachDiemDanh?dotId=${dotId}`)
                .then(response => response.json())
                .then(data => {
                    if (data.success && data.items && data.items.length > 0) {
                        emptyMsg.style.display = "none";
                        container.style.display = "block";

                        tbody.innerHTML = data.items.map((sv, index) => `
                        <tr>
                            <td>${index + 1}</td>
                            <td>${sv.MSSV || ''}</td>
                            <td class="text-start">${sv.HoTen || ''}</td>
                            <td>${sv.TenLop || ''}</td>
                            <td>${sv.TenKhoa || ''}</td>
                            <td>${sv.ThoiGian || ''}</td>
                        </tr>
                    `).join("");
                    } else {
                        container.style.display = "none";
                        emptyMsg.style.display = "block";
                    }

                    new bootstrap.Modal(document.getElementById("danhSachDiemDanhModal")).show();
                })
                .catch(err => {
                    console.error("Lỗi tải danh sách điểm danh:", err);
                    showToast("Lỗi tải danh sách điểm danh!", "error");
                    if (emptyMsg.querySelector("h5")) {
                        emptyMsg.querySelector("h5").textContent = "Lỗi tải dữ liệu";
                    }
                });
        }
    });
});