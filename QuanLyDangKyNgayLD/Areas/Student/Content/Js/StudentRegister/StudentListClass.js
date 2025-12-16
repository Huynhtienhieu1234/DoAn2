document.addEventListener("DOMContentLoaded", function () {

    // Hàm mở modal và load danh sách lớp
    window.moModalDangKyLop = function (dotId) {
        $.get("/Student/StudentRegisterWord/KiemTraDangKyLop", { dotId: dotId }, function (checkRes) {
            if (checkRes.success) {
                const btn = document.getElementById("btnXacNhanDangKyLop");
                if (btn) {
                    btn.innerText = checkRes.daDangKy ? "Chỉnh sửa danh sách" : "Đăng ký lớp";
                    btn.classList.toggle("btn-primary", !checkRes.daDangKy);
                    btn.classList.toggle("btn-warning", checkRes.daDangKy);
                    btn.dataset.action = checkRes.daDangKy ? "update" : "create";
                    btn.dataset.dotId = dotId; // gắn lại dotId để đảm bảo đúng
                }

                // ✅ Gọi API GetDanhSachLop kèm dotId
                $.get("/Student/StudentRegisterWord/GetDanhSachLop", { dotId: dotId }, function (res) {
                    if (res && res.success && Array.isArray(res.sinhViens)) {
                        const container = document.getElementById("modalContentLop");
                        let html = `
                            <div class="mb-3">
                              <button class="btn btn-sm btn-outline-primary me-2" onclick="chonTatCa()">Chọn tất cả</button>
                              <button class="btn btn-sm btn-outline-danger" onclick="boChonTatCa()">Bỏ chọn tất cả</button>
                            </div>
                            <table class="table table-bordered table-hover">
                              <thead>
                                <tr>
                                  <th>STT</th>
                                  <th>MSSV</th>
                                  <th>Họ tên</th>
                                  <th>Chọn</th>
                                </tr>
                              </thead>
                              <tbody>`;

                        // ✅ Chỉ tích checkbox nếu sv.DaDangKy = true
                        res.sinhViens.forEach((sv, index) => {
                            html += `
                                <tr>
                                  <td>${index + 1}</td>
                                  <td>${sv.MSSV}</td>
                                  <td>${sv.HoTen}</td>
                                  <td>
                                    <input type="checkbox" class="chon-sv" value="${sv.MSSV}" ${sv.DaDangKy ? "checked" : ""}>
                                  </td>
                                </tr>`;
                        });

                        html += `</tbody></table>`;
                        container.innerHTML = html;

                        const modalElement = document.getElementById("modalDangKyLop");
                        let modal = bootstrap.Modal.getInstance(modalElement);
                        if (!modal) modal = new bootstrap.Modal(modalElement);
                        modal.show();
                    } else {
                        showMainToast("Không thể tải danh sách lớp!", "error");
                    }
                });
            }
        });
    };

    // Gắn sự kiện cho nút xác nhận đăng ký / chỉnh sửa
    const btn = document.getElementById("btnXacNhanDangKyLop");
    if (btn) {
        btn.addEventListener("click", function () {
            const dotId = this.dataset.dotId;
            const action = this.dataset.action || "create";
            const selectedMSSVs = Array.from(document.querySelectorAll(".chon-sv:checked"))
                .map(input => parseInt(input.value));

            // ✅ Chỉ chặn khi đăng ký mới mà không chọn ai
            if (selectedMSSVs.length === 0 && action === "create") {
                showMainToast("Bạn chưa chọn sinh viên nào!", "warning");
                return;
            }

            const url = action === "update"
                ? "/Student/StudentRegisterWord/CapNhatDangKyTheoLop"
                : "/Student/StudentRegisterWord/DangKyTheoLop";

            $.ajax({
                url: url,
                type: "POST",
                data: {
                    dotId: dotId,
                    mssvList: selectedMSSVs
                },
                traditional: true,
                success: function (res) {
                    if (res.success) {
                        showMainToast(res.message || "Thao tác thành công!", "success");

                        const modalElement = document.getElementById("modalDangKyLop");
                        let modal = bootstrap.Modal.getInstance(modalElement);
                        if (!modal) modal = new bootstrap.Modal(modalElement);
                        modal.hide();

                        loadAndRenderData(); // cập nhật lại bảng

                        // Cập nhật nút xác nhận
                        btn.innerText = "Chỉnh sửa danh sách";
                        btn.classList.remove("btn-primary");
                        btn.classList.add("btn-warning");
                        btn.dataset.action = "update";
                    } else {
                        showMainToast(res.message || "Thao tác thất bại!", "error");
                    }
                },
                error: function () {
                    showMainToast("Lỗi server (500)!", "error");
                }
            });
        });
    }
});

// Hàm chọn tất cả
function chonTatCa() {
    document.querySelectorAll(".chon-sv").forEach(cb => cb.checked = true);
}

// Hàm bỏ chọn tất cả
function boChonTatCa() {
    document.querySelectorAll(".chon-sv").forEach(cb => cb.checked = false);
}
