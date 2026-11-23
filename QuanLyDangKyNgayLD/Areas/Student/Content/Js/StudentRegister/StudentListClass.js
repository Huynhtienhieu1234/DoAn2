document.addEventListener("DOMContentLoaded", function () {
    let currentGioiHanSV = 20;

    function capNhatSoLuongChon() {
        const checkedCount = document.querySelectorAll(".chon-sv:checked").length;
        const countEl = document.getElementById("soSVChonBadge");
        if (countEl) {
            countEl.textContent = `${checkedCount}/${currentGioiHanSV} sinh viên`;
            if (checkedCount >= currentGioiHanSV) {
                countEl.className = "badge bg-warning text-dark px-3 py-2 fs-6";
            } else {
                countEl.className = "badge bg-primary px-3 py-2 fs-6";
            }
        }
    }

    // Hàm mở modal và load danh sách lớp
    window.moModalDangKyLop = function (dotId) {
        $.get("/Student/StudentRegisterWord/KiemTraDangKyLop", { dotId: dotId }, function (checkRes) {
            if (checkRes.success) {
                const btn = document.getElementById("btnXacNhanDangKyLop");
                if (btn) {
                    btn.innerText = checkRes.daDangKy ? "Chỉnh sửa danh sách" : "Đăng ký lớp";
                    btn.classList.toggle("student-btn-primary", !checkRes.daDangKy);
                    btn.classList.toggle("student-btn-warning", checkRes.daDangKy);
                    btn.dataset.action = checkRes.daDangKy ? "update" : "create";
                    btn.dataset.dotId = dotId; // gắn lại dotId để đảm bảo đúng
                }

                // ✅ Gọi API GetDanhSachLop kèm dotId
                $.get("/Student/StudentRegisterWord/GetDanhSachLop", { dotId: dotId }, function (res) {
                    if (res && res.success && Array.isArray(res.sinhViens)) {
                        currentGioiHanSV = res.gioiHanSV || 20;
                        const container = document.getElementById("modalContentLop");
                        let html = `
                            <div class="d-flex flex-wrap justify-content-between align-items-center mb-3 p-2 bg-light rounded border">
                              <div class="d-flex gap-2">
                                <button type="button" class="btn btn-sm btn-outline-primary fw-semibold" onclick="chonTatCa()">
                                    <i class="fas fa-check-double me-1"></i>Chọn (tối đa ${currentGioiHanSV})
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger fw-semibold" onclick="boChonTatCa()">
                                    <i class="fas fa-times me-1"></i>Bỏ chọn tất cả
                                </button>
                              </div>
                              <div class="mt-2 mt-sm-0">
                                <span class="fw-bold text-muted me-2">Đã chọn:</span>
                                <span id="soSVChonBadge" class="badge bg-primary px-3 py-2 fs-6">0/${currentGioiHanSV} sinh viên</span>
                              </div>
                            </div>
                            <div class="alert alert-info py-2 px-3 mb-3 d-flex align-items-center gap-2" style="font-size: 0.9rem;">
                                <i class="fas fa-info-circle text-primary fs-5"></i>
                                <span>Đợt này quy định mỗi lớp cử <strong>tối đa ${currentGioiHanSV} sinh viên</strong> tham gia.</span>
                            </div>
                            <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-bordered table-hover align-middle mb-0">
                              <thead class="table-light sticky-top">
                                <tr>
                                  <th style="width: 10%;" class="text-center">STT</th>
                                  <th style="width: 25%;">MSSV</th>
                                  <th style="width: 45%;">Họ tên</th>
                                  <th style="width: 20%;" class="text-center">Chọn</th>
                                </tr>
                              </thead>
                              <tbody>`;

                        // ✅ Chỉ tích checkbox nếu sv.DaDangKy = true
                        res.sinhViens.forEach((sv, index) => {
                            html += `
                                <tr>
                                  <td class="text-center">${index + 1}</td>
                                  <td><span class="fw-semibold text-primary">${sv.MSSV}</span></td>
                                  <td>${sv.HoTen}</td>
                                  <td class="text-center">
                                    <input type="checkbox" class="form-check-input chon-sv" value="${sv.MSSV}" ${sv.DaDangKy ? "checked" : ""}>
                                  </td>
                                </tr>`;
                        });

                        html += `</tbody></table></div>`;
                        container.innerHTML = html;

                        // Lắng nghe sự kiện change trên từng checkbox để giới hạn số lượng
                        const checkboxes = container.querySelectorAll(".chon-sv");
                        checkboxes.forEach(cb => {
                            cb.addEventListener("change", function () {
                                const checkedCount = container.querySelectorAll(".chon-sv:checked").length;
                                if (checkedCount > currentGioiHanSV) {
                                    this.checked = false;
                                    showMainToast(`Đợt này chỉ cho phép tối đa ${currentGioiHanSV} sinh viên mỗi lớp!`, "warning");
                                }
                                capNhatSoLuongChon();
                            });
                        });

                        capNhatSoLuongChon();

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

            if (selectedMSSVs.length > currentGioiHanSV) {
                showMainToast(`Số lượng sinh viên vượt quá giới hạn (tối đa ${currentGioiHanSV} sinh viên)!`, "warning");
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

                        if (typeof loadAndRenderData === "function") {
                            loadAndRenderData(false);
                        } else {
                            location.reload();
                        }

                        // Cập nhật nút xác nhận
                        btn.innerText = "Chỉnh sửa danh sách";
                        btn.classList.remove("student-btn-primary");
                        btn.classList.add("student-btn-warning");
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

    // Hàm chọn tất cả (giới hạn tối đa currentGioiHanSV)
    window.chonTatCa = function () {
        const checkboxes = document.querySelectorAll(".chon-sv");
        let count = 0;
        let warned = false;
        checkboxes.forEach((cb) => {
            if (count < currentGioiHanSV) {
                cb.checked = true;
                count++;
            } else {
                cb.checked = false;
                warned = true;
            }
        });
        if (warned) {
            showMainToast(`Đã tự động chọn tối đa ${currentGioiHanSV} sinh viên theo quy định của đợt!`, "info");
        }
        capNhatSoLuongChon();
    };

    // Hàm bỏ chọn tất cả
    window.boChonTatCa = function () {
        document.querySelectorAll(".chon-sv").forEach(cb => cb.checked = false);
        capNhatSoLuongChon();
    };
});
