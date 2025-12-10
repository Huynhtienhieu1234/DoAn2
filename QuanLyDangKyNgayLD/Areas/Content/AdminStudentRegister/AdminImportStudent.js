document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("importForm");
    const fileInput = document.getElementById("excelFileInput");
    const modalEl = document.getElementById("importExcelModal");

    if (!form || !fileInput || !modalEl) return;

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        if (!fileInput.files.length) {
            showToast("Vui lòng chọn file Excel trước khi nhập.", "error");
            return;
        }

        const formData = new FormData(form);

        fetch("/AdminStudent/ImportExcel", {
            method: "POST",
            body: formData
        })
            .then(r => r.json())
            .then(d => {
                if (d.success) {
                    showToast(`Nạp thành công ${d.successCount} sinh viên, có ${d.errorCount} lỗi.`, "success");

                    if (d.errorList && d.errorList.length > 0) {
                        let errorHtml = "<ul>";
                        d.errorList.forEach(err => {
                            errorHtml += `<li>${err}</li>`;
                        });
                        errorHtml += "</ul>";
                        showToast(errorHtml, "error");
                    }

                    // đóng modal sau khi nhập xong
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    modal.hide();

                    // reset input file
                    fileInput.value = "";
                } else {
                    showToast("Lỗi: " + d.message, "error");
                }
            })
            .catch(err => {
                console.error("Lỗi import:", err);
                showToast("Có lỗi xảy ra khi gọi API ImportExcel", "error");
            });
    });
});
