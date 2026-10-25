# Nexora code sandbox (profile « code »): the controller (sandbox.py, root, holds the Docker socket)
# and every sandbox it starts (runner.py, user 10001, no network) run from this one image.
# Python 3.12 pinned by digest; libraries pinned with hashes (requirements.txt).
FROM python:3.12-slim-bookworm@sha256:6a0e06f5ba0b373d051aabd3fffb9b873f27f9a2a3a14bcbe37dee6f0e3bbc70

ENV PYTHONDONTWRITEBYTECODE=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_ROOT_USER_ACTION=ignore

COPY requirements.txt /opt/nexora-code/requirements.txt

# The font cache is built once here (read-only at run time; runner.py copies it to /tmp). Setuid and
# setgid bits are removed: sandboxes already run with no-new-privileges, this is a second wall.
RUN pip install --require-hashes --no-deps -r /opt/nexora-code/requirements.txt \
 && useradd --uid 10001 --user-group --no-create-home --no-log-init --home-dir /tmp --shell /usr/sbin/nologin sandbox \
 && MPLCONFIGDIR=/opt/nexora-code/matplotlib MPLBACKEND=Agg python -I -c "import matplotlib.pyplot, pandas, openpyxl" \
 && chmod -R a+rX /opt/nexora-code \
 && find / -xdev -type f -perm /6000 -exec chmod a-s {} + \
 && rm -rf /root/.cache

COPY sandbox.py runner.py /opt/nexora-code/

EXPOSE 8080
HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD ["python3", "-I", "-c", "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/health', timeout=3)"]
CMD ["python3", "-I", "/opt/nexora-code/sandbox.py"]
