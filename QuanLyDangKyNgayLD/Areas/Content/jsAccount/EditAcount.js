document.addEventListener("DOMContentLoaded", function () {
    const editModal = document.getElementById("editModal");
    const editForm = document.getElementById("editForm");
    const editId = document.getElementById("editId");
    const editUsername = document.getElementById("editUsername");
    const editEmail = document.getElementById("editEmail");
    const editPassword = document.getElementById("editPassword");
    const editRole = document.getElementById("editRole");
    const toggleEye = document.getElementById("toggleEye");

    /* ==========================
       NÚT CON MẮT HIỆN/ẨN MẬT KHẨU
       ========================== */
    function togglePassword() {
        if (editPassword.type === "password") {
            editPassword.type = "text";
            toggleEye.classList.remove("fa-eye");
            toggleEye.classList.add("fa-eye-slash");
        } else {
            editPassword.type = "password";
            toggleEye.classList.remove("fa-eye-slash");
            toggleEye.classList.add("fa-eye");
        }
    }
    if (toggleEye) toggleEye.addEventListener("click", togglePassword);

    /* ==========================
       MỞ MODAL CHỈNH SỬA (nạp dữ liệu)
       ========================== */
    document.addEventListener("click", function (e) {
        if (e.target.closest(".btn-edit")) {
            const btn = e.target.closest(".btn-edit");
            const id = btn.dataset.id;

            // 👉 Gọi API lấy thông tin tài khoản theo id
            fetch(`/Admin/Account/GetAccountById?id=${id}`)
                .then(r => r.json())
                .then(acc => {
                    if (!acc) {
                        showToast("Không tìm thấy tài khoản!", "error");
                        return;
                    }

                    // Nạp dữ liệu vào form
                    editId.value = acc.TaiKhoan_id;
                    editUsername.value = acc.Username;
                    editEmail.value = acc.Email ?? "";
                    editPassword.value = ""; // để trống nếu không đổi
                    editRole.value = acc.VaiTro_id;

                    // Mở modal
                    const modal = bootstrap.Modal.getOrCreateInstance(editModal);
                    modal.show();
                })
                .catch(() => showToast("Lỗi tải dữ liệu!", "error"));
        }
    });

    /* ==========================
       SUBMIT FORM CHỈNH SỬA (AJAX)
       ========================== */
    if (editForm) {
        editForm.addEventListener("submit", function (e) {
            e.preventDefault();

            const data = {
                TaiKhoan_id: editId.value,
                Username: editUsername.value.trim(),
                Email: editEmail.value.trim(),
                Password: editPassword.value.trim(), // để trống nếu không đổi
                VaiTro_id: editRole.value
            };

            fetch(editForm.action, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]').value
                },
                body: JSON.stringify(data)
            })
                .then(r => r.json())
                .then(res => {
                    if (res.success) {
                        showToast(res.message, "success");
                        bootstrap.Modal.getInstance(editModal).hide();
                        loadAccounts(currentPage); // load lại bảng ở trang hiện tại
                    } else {
                        showToast(res.message, "error");
                    }
                })
                .catch(() => showToast("Lỗi kết nối đến server!", "error"));
        });
    }

    /* ==========================
    LOAD DỮ LIỆU BẢNG + PHÂN TRANG
    ========================== */
    let currentPage = 1;
    const pageSize = 5;

    function loadAccounts(page = 1) {
        const loading = document.getElementById("loadingIndicator");
        const tableBody = document.getElementById("accountTableBody");
        const pageNumbers = document.getElementById("pageNumbers");
        const prevBtn = document.getElementById("prev");
        const nextBtn = document.getElementById("next");

        if (loading) loading.style.display = "block";
        animateTable();

        fetch(`/Admin/Account/GetAccounts?page=${page}&pageSize=${pageSize}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                const totalPages = res.totalPages || 1;
                currentPage = page; // cập nhật ngay theo tham số

                tableBody.innerHTML = "";

                if (data.length === 0) {
                    tableBody.innerHTML = `
                    <tr class="no-data-row">
                        <td colspan="6" class="text-muted py-4 text-center">Không có dữ liệu</td>
                    </tr>`;
                    pageNumbers.innerHTML = "";
                    prevBtn.disabled = true;
                    nextBtn.disabled = true;
                    prevBtn.classList.add("disabled");
                    nextBtn.classList.add("disabled");
                    return;
                }

                // Render dữ liệu bảng
                data.forEach((acc, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                    <td class="stt-cell text-center">${(currentPage - 1) * pageSize + index + 1}</td>
                    <td>${acc.Username}</td>
                    <td class="text-truncate" style="max-width:200px;" title="${acc.Email ?? ""}">
                        ${acc.Email ?? ""}
                    </td>
                    <td>${acc.RoleName ?? "Chưa có vai trò"}</td>
                    <td class="action-cell text-center">
                        <button class="btn btn-sm btn-warning btn-edit me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-edit"></i></button>
                        <button class="btn btn-sm btn-danger btn-delete me-1" data-id="${acc.TaiKhoan_id}"><i class="fas fa-trash"></i></button>
                        <button class="btn btn-sm btn-info btn-detail me-1 text-white" data-id="${acc.TaiKhoan_id}"><i class="fas fa-info-circle"></i></button>
                        <button class="btn btn-sm btn-secondary btn-reset" data-id="${acc.TaiKhoan_id}"><i class="fas fa-key"></i></button>
                    </td>`;
                    tableBody.appendChild(row);
                });

                // Render phân trang mượt hơn
                const fragment = document.createDocumentFragment();
                for (let i = 1; i <= totalPages; i++) {
                    const btn = document.createElement("button");
                    btn.className = "btn btn-sm mx-1 page-number " +
                        (i === currentPage ? "btn-primary" : "btn-outline-primary");
                    btn.textContent = i;
                    btn.addEventListener("click", () => loadAccounts(i));
                    fragment.appendChild(btn);
                }
                pageNumbers.innerHTML = "";
                pageNumbers.appendChild(fragment);

                // Cập nhật trạng thái prev/next
                prevBtn.disabled = currentPage <= 1;
                nextBtn.disabled = currentPage >= totalPages;
                prevBtn.classList.toggle("disabled", currentPage <= 1);
                nextBtn.classList.toggle("disabled", currentPage >= totalPages);
            })
            .catch(() => showToast("Không thể tải dữ liệu mới!", "error"))
            .finally(() => {
                if (loading) loading.style.display = "none";
            });
    }


    document.getElementById("prev").addEventListener("click", () => {
        if (currentPage > 1) loadAccounts(currentPage - 1);
    });
    document.getElementById("next").addEventListener("click", () => {
        loadAccounts(currentPage + 1);
    });

    loadAccounts(1);

    /* ==========================
       HIỆU ỨNG FADE-IN/FADE-OUT
       ========================== */
    function animateTable() {
        const tableBody = document.getElementById("accountTableBody");
        tableBody.classList.remove("show");
        tableBody.classList.add("table-soft");

        setTimeout(() => {
            tableBody.classList.add("show");
        }, 50); // delay nhỏ để kích hoạt transition
    }







});
