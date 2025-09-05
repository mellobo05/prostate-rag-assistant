import unittest
from unittest.mock import patch, MagicMock
import os
import sys

# Add src to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from extractor import extract_data_from_pdf

class TestExtractor(unittest.TestCase):
    
    @patch('extractor.load_pdf_from_path')
    @patch('extractor.build_vectorstore')
    def test_extract_data_from_pdf_success(self, mock_build_vectorstore, mock_load_pdf):
        # Mock the PDF loading
        mock_docs = [MagicMock()]
        mock_load_pdf.return_value = mock_docs
        
        # Mock the vectorstore building
        mock_vectorstore = MagicMock()
        mock_build_vectorstore.return_value = mock_vectorstore
        
        # Test the function
        pdf_path = 'test.pdf'
        result = extract_data_from_pdf(pdf_path)
        
        # Assertions
        mock_load_pdf.assert_called_once_with(pdf_path)
        mock_build_vectorstore.assert_called_once_with(mock_docs)
        self.assertEqual(result, mock_vectorstore)
    
    def test_extract_data_from_pdf_file_not_found(self):
        with self.assertRaises(FileNotFoundError):
            extract_data_from_pdf('nonexistent.pdf')

if __name__ == '__main__':
    unittest.main()
