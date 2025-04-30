import https from 'https';
import fs from 'fs';
import path from 'path';

export const getSSLConfig = (): https.ServerOptions | undefined => {
  if (process.env.NODE_ENV === 'production') {
    try {
      return {
        key: fs.readFileSync(path.join(__dirname, '../../ssl/private.key')),
        cert: fs.readFileSync(path.join(__dirname, '../../ssl/certificate.crt')),
        ca: fs.readFileSync(path.join(__dirname, '../../ssl/ca_bundle.crt')),
        secureOptions: require('constants').SSL_OP_NO_TLSv1 | require('constants').SSL_OP_NO_TLSv1_1,
        ciphers: [
          'ECDHE-ECDSA-AES128-GCM-SHA256',
          'ECDHE-RSA-AES128-GCM-SHA256',
          'ECDHE-ECDSA-AES256-GCM-SHA384',
          'ECDHE-RSA-AES256-GCM-SHA384',
          'ECDHE-ECDSA-CHACHA20-POLY1305',
          'ECDHE-RSA-CHACHA20-POLY1305',
          'DHE-RSA-AES128-GCM-SHA256',
          'DHE-RSA-AES256-GCM-SHA384'
        ].join(':'),
        honorCipherOrder: true,
        minVersion: 'TLSv1.2'
      };
    } catch (error) {
      console.error('SSL configuration error:', error);
      return undefined;
    }
  }
  return undefined;
}; 