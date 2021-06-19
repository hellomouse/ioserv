# UnrealIRCd spkifp

i read code and openssl docs so you don't have to

## what

spkifp is an authentication method in unreal that is similar to certfp except
it hashes the public key instead of the certificate itself. This carries the
benefit that certificate changes due to, for example, renewals, do not
necessitate updating the fingerprint to match.

## how

- extract public key from certificate, in DER form
- hash it with sha256
- convert to base64
- feed that to unreal
- tell ioserv (config.cert, config.certkey) to use the key
- hooray, no more link-security degrading

Commands for lazy people like me:
```sh
# generate keypair
openssl req -new -newkey ed25519 -x509 -days 3650 -nodes -sha256 -subj '/O=Hellomouse/CN=IoServ' -keyout ioserv.pem -out ioserv.cert.pem
# obtain public key and hash
openssl x509 -pubkey -noout -in ioserv.cert.pem | openssl pkey -pubin -pubout -outform der | sha256sum | cut -d ' ' -f 1 | xxd -r -p | base64
```

