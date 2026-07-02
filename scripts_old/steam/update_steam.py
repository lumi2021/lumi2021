import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from pathlib import Path

AUTH_ENV_VAR = "76561198434273671,655AA400716FB3EEFA7014549CB35BFB".split(",") #os.environ["STEAM_AUTH"].split(",")
if len(AUTH_ENV_VAR) != 2: raise RuntimeError("Invalid STEAM_AUTH env var! format must be \"{user_id},{API_KEY}\"")

STEAM_ID = AUTH_ENV_VAR[0].strip()
API_KEY = AUTH_ENV_VAR[1].strip()

README = Path("README.md")

