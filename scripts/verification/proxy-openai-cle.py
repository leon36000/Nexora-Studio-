#!/usr/bin/env python3
"""Relais OpenAI-compatible qui ajoute la clé d'API : pour la fumée sur un serveur dont la passerelle de modèles
(LiteLLM, par exemple) exige une clé, alors que le test « OpenAI-compatible » de la fumée ajoute un modèle par son
adresse seule. Écoute sur le port RELAIS_PORT (défaut 4001) et transmet chaque requête à RELAIS_AMONT avec
« Authorization: Bearer $RELAIS_CLE » (variable d'environnement, jamais en argument ni affichée).

Usage : RELAIS_AMONT=http://passerelle:4000 RELAIS_CLE=… python3 proxy-openai-cle.py
"""
import http.server
import os
import socketserver
import urllib.error
import urllib.request

AMONT = os.environ["RELAIS_AMONT"].rstrip("/")
CLE = os.environ.get("RELAIS_CLE", "")
PORT = int(os.environ.get("RELAIS_PORT", "4001"))
SAUTE = {"host", "content-length", "connection", "authorization", "accept-encoding", "transfer-encoding"}


class Relais(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"  # la réponse se termine à la fermeture : le flux passe tel quel

    def _relayer(self):
        taille = int(self.headers.get("Content-Length") or 0)
        corps = self.rfile.read(taille) if taille else None
        entetes = {k: v for k, v in self.headers.items() if k.lower() not in SAUTE}
        if CLE:
            entetes["Authorization"] = f"Bearer {CLE}"
        requete = urllib.request.Request(AMONT + self.path, data=corps, headers=entetes, method=self.command)
        try:
            reponse = urllib.request.urlopen(requete, timeout=300)
        except urllib.error.HTTPError as erreur:
            reponse = erreur
        except Exception as erreur:  # amont injoignable
            self.send_error(502, f"amont injoignable : {type(erreur).__name__}")
            return
        self.send_response(reponse.status if hasattr(reponse, "status") else reponse.code)
        for nom, valeur in reponse.headers.items():
            if nom.lower() not in {"transfer-encoding", "connection", "content-length"}:
                self.send_header(nom, valeur)
        self.end_headers()
        while True:
            morceau = reponse.read(4096)
            if not morceau:
                break
            self.wfile.write(morceau)
            self.wfile.flush()

    do_GET = do_POST = do_DELETE = do_PUT = _relayer

    def log_message(self, *args):
        pass


class Serveur(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    Serveur(("0.0.0.0", PORT), Relais).serve_forever()
