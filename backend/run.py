import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

import uvicorn
from app.config import settings

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
