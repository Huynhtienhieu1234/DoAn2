document.addEventListener("DOMContentLoaded", function () {
    const btnSubmit = document.getElementById("btnSubmitImportStudentExcel");
    const fileInput = document.getElementById("excelFileInput");
    const modalEl = document.getElementById("importExcelModal");
    const progress = document.getElementById("importStudentProgress");
    const errorContainer = document.getElementById("importStudentErrorContainer");
    const errorList = document.getElementById("importStudentErrorList");

    function notifyAlert(icon, title, message, htmlExtra) {
        let contentHtml = `<p class="mb-2 fw-semibold">${message}</p>`;
        if (htmlExtra) contentHtml += htmlExtra;

        if (typeof Swal !== 'undefined') {
            return Swal.fire({
                icon: icon,
                title: title,
                html: contentHtml,
                confirmButtonText: 'Đóng',
                confirmButtonColor: icon === 'success' ? '#198754' : '#0d6efd'
            });
        } else {
            alert(title + "\n" + message);
            return Promise.resolve();
        }
    }

    if (!btnSubmit || !fileInput) return;

    btnSubmit.addEventListener("click", function () {
        if (!fileInput.files || !fileInput.files.length) {
            notifyAlert('warning', 'Chưa chọn file', 'Vui lòng chọn 1 file Excel (.xlsx) trước khi bấm Import!');
            return;
        }

        const formData = new FormData();
        formData.append("file", fileInput.files[0]);

        if (progress) progress.classList.remove("d-none");
        if (errorContainer) errorContainer.classList.add("d-none");
        if (errorList) errorList.innerHTML = "";
        btnSubmit.disabled = true;

        fetch("/Admin/AdminStudent/ImportExcel", {
            method: "POST",
            body: formData
        })
        .then(r => r.json())
        .then(d => {
            if (progress) progress.classList.add("d-none");
            btnSubmit.disabled = false;

            if (d.success) {
                const modal = bootstrap.Modal.getInstance(modalEl);
                if (modal) modal.hide();

                if (d.errors && d.errors.length > 0) {
                    let listHtml = `<div style="max-height: 180px; overflow-y: auto; text-align: left; background: #fff3cd; border: 1px solid #ffeeba; padding: 10px; border-radius: 6px; font-size: 0.85rem;"><ul class="mb-0 ps-3 text-dark">`;
                    d.errors.forEach(err => {
                        listHtml += `<li>${err}</li>`;
                    });
                    listHtml += `</ul></div>`;

                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'info',
                            title: 'Nhập thành công một phần!',
                            html: `<p class="fw-bold mb-2 text-dark">${d.message}</p>${listHtml}`,
                            confirmButtonText: 'Đóng & Tải lại',
                            confirmButtonColor: '#0d6efd'
                        }).then(() => {
                            if (typeof loadStudents === "function") loadStudents(1);
                            else location.reload();
                        });
                    } else {
                        alert(d.message);
                        if (typeof loadStudents === "function") loadStudents(1);
                        else location.reload();
                    }
                } else {
                    if (typeof Swal !== 'undefined') {
                        Swal.fire({
                            icon: 'success',
                            title: 'Thành công!',
                            text: d.message,
                            confirmButtonText: 'Tuyệt vời',
                            confirmButtonColor: '#198754'
                        }).then(() => {
                            if (typeof loadStudents === "function") loadStudents(1);
                            else location.reload();
                        });
                    } else {
                        alert(d.message);
                        if (typeof loadStudents === "function") loadStudents(1);
                        else location.reload();
                    }
                }
            } else {
                let listHtml = "";
                if (d.errors && d.errors.length > 0) {
                    if (errorContainer) errorContainer.classList.remove("d-none");
                    listHtml = `<div style="max-height: 180px; overflow-y: auto; text-align: left; background: #f8d7da; border: 1px solid #f5c6cb; padding: 10px; border-radius: 6px; font-size: 0.85rem;"><ul class="mb-0 ps-3 text-danger">`;
                    d.errors.forEach(err => {
                        listHtml += `<li>${err}</li>`;
                    });
                    listHtml += `</ul></div>`;
                }

                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'error',
                        title: 'Nhập file thất bại!',
                        html: `<p class="fw-bold mb-2 text-danger">${d.message || 'Có lỗi xảy ra'}</p>${listHtml}`,
                        confirmButtonText: 'Đóng & Thử lại',
                        confirmButtonColor: '#dc3545'
                    });
                } else {
                    alert(d.message || "Lỗi nhập file");
                }
            }
        })
        .catch(err => {
            if (progress) progress.classList.add("d-none");
            btnSubmit.disabled = false;
            if (typeof Swal !== 'undefined') {
                Swal.fire({
                    icon: 'error',
                    title: 'Lỗi máy chủ',
                    text: 'Có lỗi xảy ra khi gửi dữ liệu lên máy chủ: ' + err,
                    confirmButtonText: 'Đóng',
                    confirmButtonColor: '#dc3545'
                });
            } else {
                alert('Lỗi: ' + err);
            }
        });
    });
});
