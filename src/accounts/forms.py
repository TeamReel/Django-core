from accounts.models import User
from django import forms
from django.contrib.auth.password_validation import validate_password


class LoginForm(forms.Form):
    """Form for user login."""

    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)


class PasswordResetRequestForm(forms.Form):
    """Form for requesting a password reset."""

    email = forms.EmailField()


class PasswordResetConfirmForm(forms.Form):
    """Form for confirming password reset with new password."""

    new_password = forms.CharField(widget=forms.PasswordInput, validators=[validate_password])
    new_password_confirm = forms.CharField(widget=forms.PasswordInput, label="Confirm New Password")

    def clean(self):
        cleaned_data = super().clean()
        new_password = cleaned_data.get("new_password")
        new_password_confirm = cleaned_data.get("new_password_confirm")
        if new_password and new_password_confirm and new_password != new_password_confirm:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned_data


class RegistrationForm(forms.ModelForm):
    password = forms.CharField(widget=forms.PasswordInput, validators=[validate_password])
    password_confirm = forms.CharField(widget=forms.PasswordInput, label="Confirm Password")

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "password"]

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get("password")
        password_confirm = cleaned_data.get("password_confirm")
        if password and password_confirm and password != password_confirm:
            raise forms.ValidationError("Passwords do not match.")
        return cleaned_data

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password"])
        if commit:
            user.save()
        return user
