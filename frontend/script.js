document.addEventListener("DOMContentLoaded", function () {
  // Declare overlay first so it's accessible everywhere
  const overlay = document.getElementById("overlay");

  // Trial form submission
  const trialForm = document.getElementById("trialForm");
  if (trialForm) {
    trialForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const submitBtn = this.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Sending...";

      const formData = new FormData(this);
      const data = Object.fromEntries(formData.entries());

      fetch("https://smart-saline.vercel.app/request-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((res) => res.json())
        .then((response) => {
          document.getElementById("successMessage").style.display = "block";
          trialForm.reset();

          submitBtn.disabled = false;
          submitBtn.textContent = "Send Request";

          setTimeout(() => {
            trialForm.style.display = "none";
          }, 3000);
        })
        .catch((err) => {
          console.error("Request failed:", err);
          alert("Something went wrong. Please try again.");
          submitBtn.disabled = false;
          submitBtn.textContent = "Send Request";
        });
    });
  }

  // Download modal logic
  const downloadButton = document.querySelectorAll("[data-download-target]");
  const closeDownloadButton = document.querySelectorAll("[data-download-close]");

  downloadButton.forEach((button) => {
    button.addEventListener("click", () => {
      const content = document.querySelector(button.dataset.downloadTarget);
      openDownloadContent(content);
    });
  });

  closeDownloadButton.forEach((button) => {
    button.addEventListener("click", () => {
      const content = button.closest(".download-content");
      closeDownloadContent(content);
    });
  });

  function openDownloadContent(content) {
    if (content == null) return;
    content.classList.add("active");
    overlay.classList.add("active");
  }

  function closeDownloadContent(content) {
    if (content == null) return;
    content.classList.remove("active");
    overlay.classList.remove("active");
  }

  // Handle overlay click to close modals
  if (overlay) {
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        const contentsOverlay = document.querySelectorAll(".htw-content.active, .download-content.active");
        contentsOverlay.forEach((content) => {
          if (content.classList.contains("htw-content")) {
            closeContent(content);
          } else if (content.classList.contains("download-content")) {
            closeDownloadContent(content);
          }
        });
      }
    });
  }

  // Download options click
  document.querySelectorAll(".download-option").forEach(option => {
    option.addEventListener("click", function (e) {
      //e.preventDefault();
      //alert(`Download for ${this.textContent.trim()} will start shortly`);
      const content = document.querySelector(".download-content.active");
      if (content) {
        closeDownloadContent(content);
      }
    });
  });

  // Enhance date input
  const startDateInput = document.getElementById("startDate");
  if (startDateInput) {
    const today = new Date().toISOString().split("T")[0];
    startDateInput.min = today;
    startDateInput.value = today;
  }

  // How it works modal logic
  const openButton = document.querySelectorAll("[data-htw-target]");
  const closeButton = document.querySelectorAll("[data-htw-close]");

  openButton.forEach((button) => {
    button.addEventListener("click", () => {
      const content = document.querySelector(button.dataset.htwTarget);
      openContent(content);
    });
  });

  closeButton.forEach((button) => {
    button.addEventListener("click", () => {
      const content = button.closest(".htw-content");
      closeContent(content);
    });
  });

  function openContent(content) {
    if (content == null) return;
    content.classList.add("active");
    if (overlay) overlay.classList.add("active");
  }

  function closeContent(content) {
    if (content == null) return;
    content.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
  }

//feedback form submission
const feedbackForm = document.getElementById("feedbackForm");

if (feedbackForm) {
  feedbackForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const feedbackInput = document.getElementById("feedback");
    const feedbackMessage = document.getElementById("feedbackMessage");
    const submitBtn = this.querySelector('button[type="submit"]');

    const originalBtnText = submitBtn.innerHTML;

    const message = feedbackInput.value.trim();

    // Reset message field
    feedbackMessage.textContent = "";
    feedbackMessage.style.color = "";

    if (!message) {
      feedbackMessage.textContent = "⚠️ Feedback cannot be empty.";
      feedbackMessage.style.color = "red";
      feedbackInput.focus();
      return;
    }

    try {
      // Show spinner
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending...';
      submitBtn.disabled = true;

      const response = await fetch("https://smart-saline.vercel.app/submit-feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || "❌ Feedback submission failed.");
      }

      // Success feedback
      feedbackMessage.textContent = result.message || "✅ Thank you for your feedback!";
      feedbackMessage.style.color = "green";
      feedbackForm.reset();

    } catch (err) {
      console.error("Feedback submission error:", err);
      feedbackMessage.textContent = err.message || "❌ Something went wrong. Please try again.";
      feedbackMessage.style.color = "red";
    } finally {
      // Restore button
      submitBtn.innerHTML = originalBtnText;
      submitBtn.disabled = false;

      // Clear message after 5 seconds
      setTimeout(() => {
        feedbackMessage.textContent = "";
      }, 5000);
    }
  });
}
});