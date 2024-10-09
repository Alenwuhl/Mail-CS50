document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM cargado");
  // Use buttons to toggle between views
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

  // By default, load the inbox
  load_mailbox("inbox");
});

// Función para obtener el token CSRF desde las cookies
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

// Guardar el CSRF token
const csrftoken = getCookie("csrftoken");

function compose_email() {
  console.log("Componer correo");
  // Mostrar la vista de composición y ocultar las demás
  document.querySelector("#emails-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";
  document.querySelector("#compose-view").style.display = "block";

  // Limpiar los campos de entrada
  document.querySelector("#compose-recipients").value = "";
  document.querySelector("#compose-subject").value = "";
  document.querySelector("#compose-body").value = "";

  // Manejar el envío del formulario
  document.querySelector("#compose-form").onsubmit = function (event) {
    event.preventDefault(); // Evitar el envío predeterminado del formulario

    // Obtener los valores de los campos
    const recipients = document.querySelector("#compose-recipients").value;
    const subject = document.querySelector("#compose-subject").value;
    const body = document.querySelector("#compose-body").value;

    console.log("Recipients: ", recipients);
    console.log("Subject: ", subject);
    console.log("Body: ", body);

    // Validación simple
    if (!recipients || !subject || !body) {
      alert("Please complete all fields.");
      return false;
    }

    // Realizar el fetch para enviar el correo
    fetch("/emails", {
      method: "POST",
      body: JSON.stringify({
        recipients: recipients,
        subject: subject,
        body: body,
      }),
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrftoken, // Incluir el token CSRF en el encabezado
      },
    })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al enviar el correo: ${response.statusText}`);
      }
      return response.json();
    })
    .then((result) => {
      console.log("Correo enviado con éxito:", result);
      // Cargar la bandeja de enviados
      load_mailbox("sent");
    })
    .catch((error) => {
      console.error("Error al enviar el correo:", error);
    });

    return false; // Evitar el envío predeterminado del formulario
  };
}


function load_mailbox(mailbox) {
  // Mostrar la bandeja de correos y ocultar otras vistas
  document.querySelector("#emails-view").style.display = "block";
  document.querySelector("#compose-view").style.display = "none";
  document.querySelector("#email-view").style.display = "none";

  // Mostrar el nombre de la bandeja
  document.querySelector("#emails-view").innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  // Obtener los correos de la bandeja seleccionada
  fetch(`/emails/${mailbox}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Error al obtener correos: ${response.statusText}`);
      }
      return response.json();
    })
    .then((emails) => {
      console.log(emails);  // Verifica los correos recuperados
      // Limpiar el contenido actual
      const emailsList = document.createElement("div");
      emailsList.id = "emails-list";
      document.querySelector("#emails-view").append(emailsList);
      emailsList.innerHTML = ""; // Limpiar la lista antes de agregar nuevos correos

      // Recorrer los correos y mostrarlos
      emails.forEach((email) => {
        const emailDiv = document.createElement("div");
        emailDiv.className = "email-item"; // Clase para CSS

        emailDiv.innerHTML = `
          <div class="email-item-content">
            <span class="email-sender"><b>${email.sender}</b></span>
            <span class="email-subject">${email.subject}</span>
            <span class="email-timestamp">${email.timestamp}</span>
          </div>
        `;

        // Agregar clase si está leído o no
        emailDiv.classList.add(email.read ? "read" : "unread");

        // Agregar el evento para abrir el correo al hacer clic
        emailDiv.addEventListener("click", () => load_email(email.id));

        emailsList.append(emailDiv);
      });
    })
    .catch((error) => {
      console.error("Error al cargar correos:", error);
      document.querySelector("#emails-view").innerHTML = `<p>Error al cargar correos.</p>`;
    });
}



function load_email(email_id) {
  // Fetch the email using the email_id
  fetch(`/emails/${email_id}`)
    .then((response) => response.json())
    .then((email) => {
      console.log(email); // Log the email to the console (for me)

      // Limpiar la vista de correos y mostrar el contenido del correo
      document.querySelector("#emails-view").style.display = "none";
      document.querySelector("#compose-view").style.display = "none";
      document.querySelector("#email-view").style.display = "block";

      // Modernización del diseño del correo
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

      // Marcar el correo como leído
      if (!email.read) {
        fetch(`/emails/${email_id}`, {
          method: "PUT",
          body: JSON.stringify({
            read: true,
          }),
          headers: {
            "X-CSRFToken": csrftoken, // Añadir token CSRF en la solicitud PUT
          },
        });
      }

      // Botón de archivar/desarchivar
      const archiveButton = document.querySelector("#archive");
      archiveButton.innerText = email.archived ? "Unarchive" : "Archive";
      archiveButton.addEventListener("click", () => {
        // Archivar o desarchivar el correo
        fetch(`/emails/${email_id}`, {
          method: "PUT",
          body: JSON.stringify({
            archived: !email.archived,
          }),
          headers: {
            "X-CSRFToken": csrftoken, // Añadir token CSRF en la solicitud PUT
          },
        }).then(() => load_mailbox("inbox")); // Después de archivar, volver a la bandeja de entrada
      });

      // Añadir evento al botón de responder
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
      console.error("Error:", error);
      document.querySelector("#email-view").innerHTML =
        "Failed to load email.";
    });
}
