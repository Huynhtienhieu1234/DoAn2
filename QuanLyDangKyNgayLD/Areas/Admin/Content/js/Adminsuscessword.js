document.addEventListener("DOMContentLoaded", function () {
    let currentPage = 1;
    const pageSize = 10;
    let totalPages = 1;

    // Hàm load danh sách phiếu
    function loadDanhSach(page = 1) {
        const tbody = document.getElementById("duyetTableBody");
        if (!tbody) {
            console.error("Không tìm thấy #duyetTableBody trong DOM.");
            return;
        }

        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Đang tải...</td></tr>`;

        fetch(`/Admin/AdminSuscesWord/GetList?page=${page}&pageSize=${pageSize}`)
            .then(r => r.json())
            .then(res => {
                const data = res.data || [];
                currentPage = res.currentPage;
                totalPages = res.totalPages || 1;

                tbody.innerHTML = "";
                if (data.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">Không có dữ liệu</td></tr>`;
                    return;
                }

                data.forEach((item, index) => {
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td class="text-center">${(currentPage - 1) * pageSize + index + 1}</td>
                        <td>${item.HoTen}</td>
                        <td>${item.Lop}</td>
                        <td>${item.Khoa}</td>
                        <td class="text-center">${item.SoNgay ?? 0}</td>
                        <td class="text-center">
                            <button class="btn btn-sm btn-success btn-duyet" data-id="${item.id}">
                                Duyệt
                            </button>
                        </td>`;
                    tbody.appendChild(row);
                });

                renderPagination();
            })
            .catch(err => {
                console.error(err);
                tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Lỗi tải dữ liệu!</td></tr>`;
            });
    }

    // Hàm render phân trang
    function renderPagination() {
        const container = document.getElementById("pageNumbers");
        if (!container) return;

        container.innerHTML = "";
        for (let i = 1; i <= totalPages; i++) {
            const btn = document.createElement("button");
            btn.className = `btn btn-sm mx-1 ${i === currentPage ? "btn-primary" : "btn-outline-primary"}`;
            btn.textContent = i;
            btn.addEventListener("click", () => loadDanhSach(i));
            container.appendChild(btn);
        }

        const prev = document.getElementById("prev");
        const next = document.getElementById("next");
        if (prev) prev.disabled = currentPage <= 1;
        if (next) next.disabled = currentPage >= totalPages;
    }

    // Xử lý nút Prev/Next
    document.getElementById("prev")?.addEventListener("click", () => {
        if (currentPage > 1) loadDanhSach(currentPage - 1);
    });
    document.getElementById("next")?.addEventListener("click", () => {
        if (currentPage < totalPages) loadDanhSach(currentPage + 1);
    });

    // Xử lý nút Duyệt
    document.addEventListener("click", e => {
        const btn = e.target.closest(".btn-duyet");
        if (!btn) return;
        const id = btn.dataset.id;

        fetch("/Admin/AdminSuscesWord/DuyetAjax", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-RequestVerificationToken": document.querySelector('input[name="__RequestVerificationToken"]')?.value || ""
            },
            body: JSON.stringify({ id: parseInt(id) })
        })
            .then(r => r.json())
            .then(res => {
                if (res.success) {
                    alert(res.message);
                    loadDanhSach(currentPage);
                } else {
                    alert("Lỗi: " + res.message);
                }
            })
            .catch(() => alert("Lỗi kết nối server!"));
    });

    // Load lần đầu
    loadDanhSach(1);
});
