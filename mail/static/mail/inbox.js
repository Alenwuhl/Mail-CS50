document.addEventListener("DOMContentLoaded", function () {
  document
    .querySelector("#inbox")
    .addEventListener("click", () => load_mailbox("inbox"));
  document
    .querySelector("#sent")
    .addEventListener("click", () => load_mailbox("sent"));
  document
    .querySelector("#archived")
    .addEventListener("click", () => load_mailbox("archive"));
  document.querySelector("#compose").addEventListener("click", compose_email);

  load_mailbox("inbox");
});

function getCookie(name) {
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

const csrftoken = getCookie("csrftoken");

function compose_email() {
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";

  document.querySelector("#compose-form").onsubmit = function (event) {
    event.preventDefault(); 

    const recipients = document.querySelector("#compose-recipients").value;
    const subject = document.querySelector("#compose-subject").value;
    const body = document.querySelector("#compose-body").value;

    if (!recipients || !subject || !body) {
      alert("Please complete all fields.");
      return false;
    }

    fetch("/emails", {
      method: "POST",
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken,
      },
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al enviar el correo: ${response.statusText}`);
      }
      return response.json();
    })
    .then((result) => {
      load_mailbox("sent");
    })
    .catch((error) => {
      console.error("Error al enviar el correo:", error);
    });

    return false; 
  };
}


function load_mailbox(mailbox) {

  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";

  document.querySelector("#emails-view").innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener correos: ${response.statusText}`);
      }
      return response.json();
    })
    .then((emails) => {
      const emailsList = document.createElement("div");
      emailsList.id = "emails-list";
      document.querySelector("#emails-view").append(emailsList);
      emailsList.innerHTML = ""; 

        
      emails.forEach((email) => {
        const emailDiv = document.createElement("div");
        emailDiv.className = "email-item"; 

        emailDiv.innerHTML = `
          <div class="email-item-content">
            <span class="email-sender"><b>${email.sender}</b></span>
            <span class="email-subject">${email.subject}</span>
            <span class="email-timestamp">${email.timestamp}</span>
          </div>
        `;

        emailDiv.classList.add(email.read ? "read" : "unread");


        emailDiv.addEventListener("click", () => load_email(email.id));

        emailsList.append(emailDiv);
      });
    })
    .catch((error) => {
      document.querySelector("#emails-view").innerHTML = `<p>Error al cargar correos.</p>`;
    });
}



function load_email(email_id) {
  fetch(`/emails/${email_id}`)
    .then((response) => response.json())
    .then((email) => {

      document.querySelector("#emails-view").style.display = "none";
      document.querySelector("#compose-view").style.display = "none";
      document.querySelector("#email-view").style.display = "block";

      document.querySelector("#email-view").innerHTML = `
        <div class="email-header">
          <div class="email-from"><strong>From:</strong> ${email.sender}</div>
          <div class="email-to"><strong>To:</strong> ${email.recipients.join(", ")}</div>
          <div class="email-subject"><strong>Subject:</strong> ${email.subject}</div>
          <div class="email-timestamp"><strong>Timestamp:</strong> ${email.timestamp}</div>
        </div>
        <div class="email-actions">
          <button class="btn btn-primary btn-sm" id="reply">Reply</button>
          <button class="btn btn-secondary btn-sm" id="archive">Archive</button>
        </div>
        <hr>
        <div class="email-body">
          <p>${email.body}</p>
        </div>
      `;

      if (!email.read) {
        fetch(`/emails/${email_id}`, {
          method: "PUT",
          body: JSON.stringify({
            read: true,
          }),
          headers: {
            "X-CSRFToken": csrftoken, 
          },
        });
      }

      const archiveButton = document.querySelector("#archive");
      archiveButton.innerText = email.archived ? "Unarchive" : "Archive";
      archiveButton.addEventListener("click", () => {
        fetch(`/emails/${email_id}`, {
          method: "PUT",
          body: JSON.stringify({
            archived: !email.archived,
          }),
          headers: {
            "X-CSRFToken": csrftoken, 
          },
        }).then(() => load_mailbox("inbox")); 
      });


      document.querySelector("#reply").addEventListener("click", () => {
        compose_email();
        document.querySelector("#compose-recipients").value = email.sender;
        let subject = email.subject;
        if (!subject.startsWith("Re:")) {
          subject = `Re: ${email.subject}`;
        }
        document.querySelector("#compose-subject").value = subject;
        document.querySelector(
          "#compose-body"
        ).value = `\n\nOn ${email.timestamp}, ${email.sender} wrote:\n${email.body}`;
      });
    })
    .catch((error) => {
      document.querySelector("#email-view").innerHTML =
        "Failed to load email.";
    });
}
