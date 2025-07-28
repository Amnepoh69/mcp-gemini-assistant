"""OAuth service for SSO authentication."""

from typing import Optional, Dict, Any
import httpx
import structlog
from urllib.parse import urlencode, parse_qs

from app.config import settings
from shared.types import AuthProvider

logger = structlog.get_logger(__name__)


class OAuthService:
    """OAuth service for SSO authentication."""
    
    def __init__(self):
        self.google_client_id = settings.google_client_id
        self.google_client_secret = settings.google_client_secret
        self.google_redirect_uri = settings.google_redirect_uri
        
        self.linkedin_client_id = settings.linkedin_client_id
        self.linkedin_client_secret = settings.linkedin_client_secret
        self.linkedin_redirect_uri = settings.linkedin_redirect_uri
    
    def get_google_auth_url(self, state: Optional[str] = None) -> str:
        """Get Google OAuth authorization URL."""
        params = {
            "client_id": self.google_client_id,
            "redirect_uri": self.google_redirect_uri,
            "scope": "openid email profile",
            "response_type": "code",
            "access_type": "offline",
            "prompt": "consent"
        }
        
        if state:
            params["state"] = state
        
        return f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    
    def get_linkedin_auth_url(self, state: Optional[str] = None) -> str:
        """Get LinkedIn OAuth authorization URL."""
        params = {
            "client_id": self.linkedin_client_id,
            "redirect_uri": self.linkedin_redirect_uri,
            "scope": "r_liteprofile r_emailaddress",
            "response_type": "code",
            "state": state or ""
        }
        
        return f"https://www.linkedin.com/oauth/v2/authorization?{urlencode(params)}"
    
    async def exchange_google_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange Google authorization code for user info."""
        try:
            # Exchange code for token
            token_data = {
                "client_id": self.google_client_id,
                "client_secret": self.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.google_redirect_uri,
            }
            
            async with httpx.AsyncClient() as client:
                # Get access token
                token_response = await client.post(
                    "https://oauth2.googleapis.com/token",
                    data=token_data
                )
                
                if token_response.status_code != 200:
                    logger.error("Google token exchange failed", 
                               status_code=token_response.status_code,
                               response=token_response.text)
                    return None
                
                token_info = token_response.json()
                access_token = token_info.get("access_token")
                
                if not access_token:
                    logger.error("No access token in Google response")
                    return None
                
                # Get user info
                user_response = await client.get(
                    "https://www.googleapis.com/oauth2/v1/userinfo",
                    headers={"Authorization": f"Bearer {access_token}"}
                )
                
                if user_response.status_code != 200:
                    logger.error("Google user info request failed",
                               status_code=user_response.status_code)
                    return None
                
                user_info = user_response.json()
                
                # Parse user data
                return {
                    "id": user_info.get("id"),
                    "email": user_info.get("email"),
                    "first_name": user_info.get("given_name", ""),
                    "last_name": user_info.get("family_name", ""),
                    "picture": user_info.get("picture"),
                    "verified_email": user_info.get("verified_email", False)
                }
                
        except Exception as e:
            logger.error("Google OAuth exchange failed", error=str(e))
            return None
    
    async def exchange_linkedin_code(self, code: str) -> Optional[Dict[str, Any]]:
        """Exchange LinkedIn authorization code for user info."""
        try:
            # Exchange code for token
            token_data = {
                "client_id": self.linkedin_client_id,
                "client_secret": self.linkedin_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": self.linkedin_redirect_uri,
            }
            
            async with httpx.AsyncClient() as client:
                # Get access token
                token_response = await client.post(
                    "https://www.linkedin.com/oauth/v2/accessToken",
                    data=token_data
                )
                
                if token_response.status_code != 200:
                    logger.error("LinkedIn token exchange failed",
                               status_code=token_response.status_code,
                               response=token_response.text)
                    return None
                
                token_info = token_response.json()
                access_token = token_info.get("access_token")
                
                if not access_token:
                    logger.error("No access token in LinkedIn response")
                    return None
                
                headers = {"Authorization": f"Bearer {access_token}"}
                
                # Get user profile
                profile_response = await client.get(
                    "https://api.linkedin.com/v2/people/~:(id,localizedFirstName,localizedLastName)",
                    headers=headers
                )
                
                if profile_response.status_code != 200:
                    logger.error("LinkedIn profile request failed",
                               status_code=profile_response.status_code)
                    return None
                
                profile_info = profile_response.json()
                
                # Get email
                email_response = await client.get(
                    "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
                    headers=headers
                )
                
                if email_response.status_code != 200:
                    logger.error("LinkedIn email request failed",
                               status_code=email_response.status_code)
                    return None
                
                email_info = email_response.json()
                
                # Parse user data
                email = None
                if "elements" in email_info and email_info["elements"]:
                    email_element = email_info["elements"][0]
                    if "handle~" in email_element:
                        email = email_element["handle~"].get("emailAddress")
                
                return {
                    "id": profile_info.get("id"),
                    "email": email,
                    "first_name": profile_info.get("localizedFirstName", ""),
                    "last_name": profile_info.get("localizedLastName", ""),
                }
                
        except Exception as e:
            logger.error("LinkedIn OAuth exchange failed", error=str(e))
            return None
    
    async def get_user_info(self, provider: AuthProvider, code: str) -> Optional[Dict[str, Any]]:
        """Get user info from OAuth provider."""
        if provider == AuthProvider.GOOGLE:
            return await self.exchange_google_code(code)
        elif provider == AuthProvider.LINKEDIN:
            return await self.exchange_linkedin_code(code)
        else:
            logger.error("Unsupported OAuth provider", provider=provider.value)
            return None
    
    def get_auth_url(self, provider: AuthProvider, state: Optional[str] = None) -> Optional[str]:
        """Get OAuth authorization URL for provider."""
        if provider == AuthProvider.GOOGLE:
            return self.get_google_auth_url(state)
        elif provider == AuthProvider.LINKEDIN:
            return self.get_linkedin_auth_url(state)
        else:
            logger.error("Unsupported OAuth provider", provider=provider.value)
            return None
    
    def is_provider_configured(self, provider: AuthProvider) -> bool:
        """Check if OAuth provider is configured."""
        if provider == AuthProvider.GOOGLE:
            return bool(self.google_client_id and self.google_client_secret)
        elif provider == AuthProvider.LINKEDIN:
            return bool(self.linkedin_client_id and self.linkedin_client_secret)
        else:
            return False


# Global OAuth service instance
oauth_service = OAuthService()


def get_oauth_service() -> OAuthService:
    """Get OAuth service instance."""
    return oauth_service