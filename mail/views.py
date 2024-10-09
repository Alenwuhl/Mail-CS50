import json
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db import IntegrityError
from django.http import JsonResponse, HttpResponse, HttpResponseRedirect
from django.shortcuts import render
from django.urls import reverse
from django.views.decorators.csrf import csrf_exempt
from .models import User, Email
from django.db import models
from django.db.models import Q


def index(request):
    print("the user is: ", request.user)
    if request.user.is_authenticated:
        print(f"User {request.user.email} accessed the inbox.")
        return render(request, "mail/inbox.html")
    else:
        print("Unauthenticated user attempted to access inbox. Redirecting to login.")
        return HttpResponseRedirect(reverse("login"))

@csrf_exempt
@login_required
def compose(request):
    print(f"Composing email for user {request.user.email}.")
    if request.method != "POST":
        print("Invalid request method for composing email.")
        return JsonResponse({"error": "POST request required."}, status=400)

    try:
        # Log para verificar el inicio de la función
        print("Compose function started.")
        data = json.loads(request.body)
        recipients_list = data.get("recipients", "").split(",")
        emails = [email.strip() for email in recipients_list]
        print(f"Recipients received: {emails}")

        if not emails or emails == [""]:
            print("No recipients provided.")
            return JsonResponse({"error": "At least one recipient required."}, status=400)

        recipients = []
        for email in emails:
            try:
                user = User.objects.get(email=email)
                recipients.append(user)
                print(f"Recipient {email} found.")
            except User.DoesNotExist:
                print(f"Recipient {email} does not exist.")
                return JsonResponse({"error": f"User with email {email} does not exist."}, status=400)

        subject = data.get("subject", "")
        body = data.get("body", "")
        print(f"Composing email. Subject: {subject}, Body: {body}")

        # Crear el correo
        email = Email(
            user=request.user,  # Asegúrate de que este campo sea correcto
            sender=request.user,
            subject=subject,
            body=body,
            read=False  # Cambia esto a False
        )
        email.save()  # Guarda el correo
        print(f"Email created with id: {email.id}")

        # Agregar los destinatarios
        for recipient in recipients:
            email.recipients.add(recipient)

        print(f"Email successfully sent to recipients: {', '.join([user.email for user in recipients])}")

        return JsonResponse({"message": "Email sent successfully."}, status=201)

    except Exception as e:
        print(f"Error while composing email: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def mailbox(request, mailbox):
    print(f"Fetching {mailbox} mailbox for user {request.user.email}.")

    try:
        if mailbox == "inbox":
            # Mostrar correos donde el usuario es destinatario
            emails = Email.objects.filter(
                recipients=request.user, archived=False
            )
        elif mailbox == "sent":
            # Mostrar correos enviados por el usuario
            emails = Email.objects.filter(
                sender=request.user
            )
        elif mailbox == "archive":
            # Mostrar correos archivados donde el usuario es destinatario
            emails = Email.objects.filter(
                recipients=request.user, archived=True
            )
        else:
            print(f"Invalid mailbox type: {mailbox}.")
            return JsonResponse({"error": "Invalid mailbox."}, status=400)

        print(f"Found {emails.count()} emails in {mailbox} for user {request.user.email}.")
        emails = emails.order_by("-timestamp").all()
        return JsonResponse([email.serialize() for email in emails], safe=False)

    except Exception as e:
        print(f"Error while fetching mailbox {mailbox}: {str(e)}")
        return JsonResponse({"error": f"Error fetching emails: {str(e)}"}, status=500)


@csrf_exempt
@login_required
def email(request, email_id):
    print(f"Fetching email with ID {email_id} for user {request.user.email}.")

    try:
        # Buscar el correo donde el usuario es el remitente o destinatario
        email = Email.objects.filter(pk=email_id).filter(
            models.Q(sender=request.user) | models.Q(recipients=request.user)
        ).first()
        
        if not email:
            raise Email.DoesNotExist
        
        print(f"Email {email_id} found.")
    except Email.DoesNotExist:
        print(f"Email {email_id} not found.")
        return JsonResponse({"error": "Email not found."}, status=404)

    if request.method == "GET":
        print(f"Returning details for email {email_id}.")
        return JsonResponse(email.serialize())

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            if data.get("read") is not None:
                email.read = data["read"]
                print(f"Email {email_id} marked as {'read' if email.read else 'unread'}.")
            if data.get("archived") is not None:
                email.archived = data["archived"]
                print(f"Email {email_id} {'archived' if email.archived else 'unarchived'}.")
            email.save()
            return HttpResponse(status=204)

        except Exception as e:
            print(f"Error updating email {email_id}: {str(e)}")
            return JsonResponse({"error": f"Error updating email: {str(e)}"}, status=500)

    else:
        print(f"Invalid method for email {email_id}. Only GET and PUT are allowed.")
        return JsonResponse({"error": "GET or PUT request required."}, status=400)

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        if not email or not password:
            print("Missing email or password.")
            return render(request, "mail/login.html", {"message": "Missing email or password."})

        user = authenticate(request, username=email, password=password)
        if user is not None:
            print(f"User {email} logged in successfully.")
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            print(f"Invalid login attempt for user {email}.")
            return render(request, "mail/login.html", {"message": "Invalid email and/or password."})
    else:
        print("Rendering login page.")
        return render(request, "mail/login.html")

def logout_view(request):
    print(f"User {request.user.email} logged out.")
    logout(request)
    return HttpResponseRedirect(reverse("index"))

@csrf_exempt
@csrf_exempt
def register(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        confirmation = request.POST.get("confirmation")

        # Verificar si todos los campos están presentes
        if not email or not password or not confirmation:
            print("Missing fields in registration.")
            return render(request, "mail/register.html", {"message": "All fields are required."})

        # Verificar que las contraseñas coincidan
        if password != confirmation:
            print("Passwords do not match.")
            return render(request, "mail/register.html", {"message": "Passwords must match."})

        try:
            # Crear el usuario asegurándose de asignar el email al campo correspondiente
            user = User.objects.create_user(username=email, email=email, password=password)
            user.save()
            print(f"User {email} registered successfully.")
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        except IntegrityError:
            print(f"User {email} already exists.")
            return render(request, "mail/register.html", {"message": "Email address already taken."})

    print("Rendering registration page.")
    return render(request, "mail/register.html")
