 const loginForm = document.getElementById("loginForm");
      const username = document.getElementById("username");
      const password = document.getElementById("password");
      const departmentLogin = document.getElementById("departmentLogin");
      const departmentError = document.getElementById("departmentError");
      const passwordError = document.getElementById("passwordError");
      const usernameError = document.getElementById("usernameError");
      const conflictWarning = document.getElementById("conflictWarning");
      const { jsPDF } = window.jspdf;
      let exams = [];
      let editingIndex = -1;
      let loggedInDepartment = null;

      // Department credentials
      const departmentCredentials = {
        "Software Engineering": "Software",
        "Computer Science": "Computers",
        "Information Technology": "infot",
        Student: "student",
      };

      // Mobile menu toggle
      const menuToggle = document.getElementById("menuToggle");
      const navLinks = document.getElementById("navLinks");

      menuToggle.addEventListener("click", function (e) {
        e.stopPropagation();
        navLinks.classList.toggle("active");
      });

      // Hide menu when clicking outside on small screens
      document.addEventListener("click", function (e) {
        if (window.innerWidth <= 720 && navLinks.classList.contains("active")) {
          if (!navLinks.contains(e.target) && e.target !== menuToggle) {
            navLinks.classList.remove("active");
          }
        }
      });

      // Hide menu after clicking a link (on small screens)
      document.querySelectorAll("#navLinks a").forEach((link) => {
        link.addEventListener("click", function () {
          if (window.innerWidth <= 720) {
            navLinks.classList.remove("active");
          }
        });
      });

      function showError(element, message) {
        element.textContent = message;
        element.style.display = "block";
      }

      function clearError(element) {
        element.textContent = "";
        element.style.display = "none";
      }

      function validateDepartment(input) {
        if (!input) {
          showError(departmentError, "Please select a department");
          return false;
        }
        clearError(departmentError);
        return true;
      }

      function validatePassword(input, department) {
        const passwordInput = document.getElementById("password");
        if (departmentCredentials[department] !== input) {
          // Show the correct password as a hint
          showError(
            passwordError,
            `Invalid password for selected department. Hint: The correct password is "${departmentCredentials[department]}".`
          );
          passwordInput.classList.add("error-highlight");
          return false;
        }
        clearError(passwordError);
        passwordInput.classList.remove("error-highlight");
        return true;
      }

      function validateUsername(input) {
        if (input.trim() === "") {
          showError(usernameError, "Username is required");
          return false;
        }
        clearError(usernameError);
        return true;
      }

      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const selectedDepartment = departmentLogin.value;
        const isDepartmentValid = validateDepartment(selectedDepartment);
        const isUsernameValid = validateUsername(username.value);
        const isPasswordValid = validatePassword(
          password.value,
          selectedDepartment
        );

        if (isDepartmentValid && isUsernameValid && isPasswordValid) {
          loggedInDepartment = selectedDepartment;
          document.getElementById("loginContainer").classList.add("hidden");
          document.getElementById("examManager").classList.remove("hidden");
          document.getElementById("navLinks").style.display = "flex";
          document.getElementById("department").value = loggedInDepartment;
          document.getElementById("department").readOnly = true;

          // Hide exam creation form for students
          if (selectedDepartment === "Student") {
            document.querySelector(".input-form").style.display = "none";
            document.getElementById("conflictWarning").style.display = "none";
          } else {
            document.querySelector(".input-form").style.display = "block";
            document.getElementById("conflictWarning").style.display = "block";
          }
        }
      });

      function createExamObject() {
        return {
          course: document.getElementById("course").value,
          instructor: document.getElementById("instructor").value,
          startTime: document.getElementById("startTime").value,
          endTime: document.getElementById("endTime").value,
          block: document.getElementById("block").value,
          room: document.getElementById("room").value,
          department: loggedInDepartment, // Always use logged-in department
          year: document.getElementById("yearLevel").value,
          semester: document.getElementById("semester").value,
        };
      }

      function checkForConflicts(newExam, currentIndex = -1) {
        const conflicts = [];
        const newStart = new Date(newExam.startTime);
        const newEnd = new Date(newExam.endTime);

        exams.forEach((exam, index) => {
          if (index === currentIndex) return;
          const existingStart = new Date(exam.startTime);
          const existingEnd = new Date(exam.endTime);

          const timeConflict = newStart < existingEnd && newEnd > existingStart;
          const sameDepartment = exam.department === newExam.department;
          const sameYearSemester =
            exam.year === newExam.year && exam.semester === newExam.semester;
          const instructorConflict = exam.instructor === newExam.instructor;
          const locationConflict =
            exam.block === newExam.block && exam.room === newExam.room;

          if (timeConflict) {
            if (sameDepartment && sameYearSemester) {
              conflicts.push("Department conflict");
            }
            if (instructorConflict) {
              conflicts.push("Instructor conflict");
            }
            if (locationConflict) {
              conflicts.push("Location conflict");
            }
          }
        });

        return [...new Set(conflicts)];
      }

      function formatDate(date) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      }

      function formatTime(date) {
        return date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
      }

      function formatDateTimeRange(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);

        if (startDate.toDateString() === endDate.toDateString()) {
          return `${formatDate(startDate)}, ${formatTime(
            startDate
          )} - ${formatTime(endDate)}`;
        }
        return `${formatDate(startDate)}, ${formatTime(
          startDate
        )} - ${formatDate(endDate)}, ${formatTime(endDate)}`;
      }

      function handleExamSubmission() {
        const newExam = createExamObject();

        // Basic required fields check
        if (
          !newExam.course ||
          !newExam.instructor ||
          !newExam.startTime ||
          !newExam.endTime ||
          !newExam.department ||
          !newExam.year ||
          !newExam.semester ||
          !newExam.block ||
          !newExam.room
        ) {
          conflictWarning.textContent = "Please fill all required fields";
          conflictWarning.style.display = "block";
          return;
        }

        // Start time must be before end time
        const start = new Date(newExam.startTime);
        const end = new Date(newExam.endTime);
        if (start >= end) {
          conflictWarning.textContent = "End time must be after start time";
          conflictWarning.style.display = "block";
          return;
        }

        // Check for conflicts
        let hasConflict = false;
        let conflictMessages = [];

        exams.forEach((exam, index) => {
          // Only check against other exams (not itself if editing)
          if (index === editingIndex) return;

          const existingStart = new Date(exam.startTime);
          const existingEnd = new Date(exam.endTime);

          // Time overlap check
          const timeConflict = start < existingEnd && end > existingStart;

          // Same department, year, semester, and time overlap
          if (
            timeConflict &&
            exam.department === newExam.department &&
            exam.year === newExam.year &&
            exam.semester === newExam.semester
          ) {
            conflictMessages.push("Department & semester time conflict");
            hasConflict = true;
          }

          // Instructor conflict at the same time
          if (timeConflict && exam.instructor === newExam.instructor) {
            conflictMessages.push("Instructor is already booked at this time");
            hasConflict = true;
          }

          // Location conflict at the same time
          if (
            timeConflict &&
            exam.block === newExam.block &&
            exam.room === newExam.room
          ) {
            conflictMessages.push("Location is already booked at this time");
            hasConflict = true;
          }
        });

        if (hasConflict) {
          conflictWarning.textContent =
            "Conflicts: " + [...new Set(conflictMessages)].join(", ");
          conflictWarning.style.display = "block";
          return;
        }

        conflictWarning.style.display = "none";

        if (editingIndex > -1) {
          exams[editingIndex] = newExam;
          editingIndex = -1;
        } else {
          exams.push(newExam);
        }

        displayExams();
        clearForm();
      }

      function displayExams() {
        const container = document.getElementById("departmentSchedules");
        if (!exams.length) {
          container.innerHTML = "<p>No exams scheduled.</p>";
          return;
        }

        const grouped = {};
        exams.forEach((exam) => {
          const key = `${exam.department}||${exam.year}||${exam.semester}`;
          if (!grouped[key]) grouped[key] = [];
          grouped[key].push(exam);
        });

        let html = "";
        Object.keys(grouped).forEach((key) => {
          const [department, year, semester] = key.split("||");
          html += `<table>
                    <caption>Exam Schedule for ${department} | Year: ${year} | Semester: ${semester}</caption>
                    <tr>
                        <th>Course</th>
                        <th>Instructor</th>
                        <th>Date/Time</th>
                        <th>Location</th>
                        <th>Actions</th>
                    </tr>`;
          grouped[key].forEach((exam, index) => {
            const globalIndex = exams.indexOf(exam);
            html += `<tr>
                        <td>${exam.course}</td>
                        <td>${exam.instructor}</td>
                        <td class="time-range">
                            ${formatDateTimeRange(exam.startTime, exam.endTime)}
                        </td>
                        <td>${exam.block} ${exam.room}</td>
                        <td class="action-buttons">
                            <button class="edit-btn" onclick="editExam(${globalIndex})">Edit</button>
                            <button class="delete-btn" onclick="deleteExam(${globalIndex})">Delete</button>
                        </td>
                    </tr>`;
          });
          html += "</table><br/>";
        });

        container.innerHTML = html;
      }

      function editExam(index) {
        const exam = exams[index];
        document.getElementById("course").value = exam.course;
        document.getElementById("instructor").value = exam.instructor;
        document.getElementById("startTime").value = exam.startTime;
        document.getElementById("endTime").value = exam.endTime;
        document.getElementById("block").value = exam.block;
        document.getElementById("room").value = exam.room;
        editingIndex = index;
        document.querySelector(".input-form-block").textContent = "Update Exam";
      }

      function deleteExam(index) {
        if (confirm("Delete this exam?")) {
          exams.splice(index, 1);
          displayExams();
        }
      }

      function clearForm() {
        document.getElementById("course").value = "";
        document.getElementById("instructor").value = "";
        document.getElementById("startTime").value = "";
        document.getElementById("endTime").value = "";
        document.getElementById("block").value = "";
        document.getElementById("room").value = "";
        document.querySelector(".input-form-block").textContent = "Add Exam";
      }

      function updateHeader() {
        const year = document.getElementById("academicYear").value;
        const dept = document.getElementById("department").value;
        const yearLevel = document.getElementById("yearLevel").value;
        const semester = document.getElementById("semester").value;
        document.getElementById(
          "scheduleHeader"
        ).textContent = `Academic Year: ${year} | Department: ${dept} | Year: ${yearLevel} | Semester: ${semester}`;
      }

      function printSchedule() {
        window.print();
      }

      function cleanFileName(str) {
        return str.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      }

      function exportToExcel() {
        if (!exams.length) return alert("No exams to export.");
        const department =
          document.getElementById("department").value || "Department";
        const ws = XLSX.utils.json_to_sheet(
          exams.map((exam) => ({
            Course: exam.course,
            Instructor: exam.instructor,
            "Time Range": formatDateTimeRange(exam.startTime, exam.endTime),
            Location: `${exam.block} ${exam.room}`,
            Year: exam.year,
            Semester: exam.semester,
          }))
        );

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Exams");
        XLSX.writeFile(wb, `ExamSchedule_${cleanFileName(department)}.xlsx`);
      }

      function exportToPDF() {
        if (!exams.length) return alert("No exams to export.");
        const department =
          document.getElementById("department").value || "Department";
        const doc = new jsPDF();
        doc.text(`Exam Schedule for ${department}`, 10, 10);
        doc.autoTable({
          head: [
            [
              "Course",
              "Instructor",
              "Time Range",
              "Location",
              "Year",
              "Semester",
            ],
          ],
          body: exams.map((e) => [
            e.course,
            e.instructor,
            formatDateTimeRange(e.startTime, e.endTime),
            `${e.block} ${e.room}`,
            e.year,
            e.semester,
          ]),
          startY: 20,
        });
        doc.save(`ExamSchedule_${cleanFileName(department)}.pdf`);
      }

      document
        .getElementById("navLogout")
        .addEventListener("click", function (e) {
          e.preventDefault();
          document.getElementById("navLinks").style.display = "none";
          document.getElementById("examManager").classList.add("hidden");
          document.getElementById("loginContainer").classList.remove("hidden");
          loginForm.reset();
          exams = [];
          editingIndex = -1;
          document.getElementById("departmentSchedules").innerHTML = "";
          document.getElementById("navLinks").style.display = "flex";
        });

      document
        .querySelector(".input-form")
        .addEventListener("submit", function (e) {
          e.preventDefault();
          handleExamSubmission();
        });

      document
        .getElementById("password")
        .addEventListener("input", function () {
          this.classList.remove("error-highlight");
          clearError(passwordError);
        });
    