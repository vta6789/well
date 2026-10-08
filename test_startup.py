"""Startup errors must be useful without hiding unrelated failures."""
import errno
import unittest
from unittest.mock import patch

import server


class StartupTests(unittest.TestCase):
    def run_with_bind_error(self, error):
        with patch('sys.argv', ['server.py', '--port', '8124']), \
                patch.object(server, 'init_db'), \
                patch.object(server, 'WellnessHTTPServer', side_effect=error):
            server.main()

    def test_occupied_port_explains_requested_url_and_recovery(self):
        with self.assertRaises(SystemExit) as result:
            self.run_with_bind_error(OSError(errno.EADDRINUSE, 'Address in use'))
        message = str(result.exception)
        self.assertIn('http://127.0.0.1:8124/', message)
        self.assertIn('Ctrl+C', message)
        self.assertIn('--port 8001', message)

    def test_windows_occupied_port_is_also_explained(self):
        error = OSError('Windows socket conflict')
        error.winerror = 10048
        with self.assertRaises(SystemExit):
            self.run_with_bind_error(error)

    def test_other_socket_errors_are_not_hidden(self):
        error = OSError(errno.EACCES, 'Permission denied')
        with self.assertRaises(OSError) as result:
            self.run_with_bind_error(error)
        self.assertIs(result.exception, error)


if __name__ == '__main__':
    unittest.main()
