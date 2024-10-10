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
        return render(request, "mail/inbox.html")
    else:
        return HttpResponseRedirect(reverse("login"))

@csrf_exempt
@login_required
def compose(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST request required."}, status=400)

    try:
        data = json.loads(request.body)
        recipients_list = data.get("recipients", "").split(",")
        emails = [email.strip() for email in recipients_list]

        if not emails or emails == [""]:
            return JsonResponse({"error": "At least one recipient required."}, status=400)

        recipients = []
        for email in emails:
            try:
                user = User.objects.get(email=email)
                recipients.append(user)
            except User.DoesNotExist:
                return JsonResponse({"error": f"User with email {email} does not exist."}, status=400)

        subject = data.get("subject", "")
        body = data.get("body", "")

        email = Email(
            user=request.user, 
            sender=request.user,
            subject=subject,
            body=body,
            read=False 
        )
        email.save()  

        for recipient in recipients:
            email.recipients.add(recipient)

        return JsonResponse({"message": "Email sent successfully."}, status=201)

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@csrf_exempt
@login_required
def mailbox(request, mailbox):

    try:
        if mailbox == "inbox":
            emails = Email.objects.filter(
                recipients=request.user, archived=False
            )
        elif mailbox == "sent":
            emails = Email.objects.filter(
                sender=request.user
            )
        elif mailbox == "archive":
            emails = Email.objects.filter(
                recipients=request.user, archived=True
            )
        else:
            return JsonResponse({"error": "Invalid mailbox."}, status=400)

        emails = emails.order_by("-timestamp").all()
        return JsonResponse([email.serialize() for email in emails], safe=False)

    except Exception as e:
        return JsonResponse({"error": f"Error fetching emails: {str(e)}"}, status=500)


@csrf_exempt
@login_required
def email(request, email_id):
    try:
        email = Email.objects.filter(pk=email_id).filter(
            models.Q(sender=request.user) | models.Q(recipients=request.user)
        ).first()
        
        if not email:
            raise Email.DoesNotExist
    except Email.DoesNotExist:
        return JsonResponse({"error": "Email not found."}, status=404)

    if request.method == "GET":
        return JsonResponse(email.serialize())

    elif request.method == "PUT":
        try:
            data = json.loads(request.body)
            if data.get("read") is not None:
                email.read = data["read"]
            if data.get("archived") is not None:
                email.archived = data["archived"]
            email.save()
            return HttpResponse(status=204)

        except Exception as e:
            return JsonResponse({"error": f"Error updating email: {str(e)}"}, status=500)

    else:
        return JsonResponse({"error": "GET or PUT request required."}, status=400)

@csrf_exempt
def login_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")

        if not email or not password:
            return render(request, "mail/login.html", {"message": "Missing email or password."})

        user = authenticate(request, username=email, password=password)
        if user is not None:
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        else:
            return render(request, "mail/login.html", {"message": "Invalid email and/or password."})
    else:
        return render(request, "mail/login.html")

def logout_view(request):
    logout(request)
    return HttpResponseRedirect(reverse("index"))

@csrf_exempt
@csrf_exempt
def register(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        confirmation = request.POST.get("confirmation")

        if not email or not password or not confirmation:
            return render(request, "mail/register.html", {"message": "All fields are required."})

        if password != confirmation:
            return render(request, "mail/register.html", {"message": "Passwords must match."})

        try:
            user = User.objects.create_user(username=email, email=email, password=password)
            user.save()
            login(request, user)
            return HttpResponseRedirect(reverse("index"))
        except IntegrityError:
            return render(request, "mail/register.html", {"message": "Email address already taken."})

    return render(request, "mail/register.html")
