from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from fact_check_agents import CustomWikiAgent, DatabaseAgent
import os
import sqlite3
import pandas as pd
from langchain_community.utilities.sql_database import SQLDatabase


app = Flask(__name__)
CORS(app)


@app.route('/searchWiki', methods=['POST'])
def search():

    search_query = request.json.get('query')
    print(search_query)

    # Perform your search logic here (replace this with your actual search function)
    # search_result = f'Searching for: {search_query}'
    search_result = CustomWikiAgent(claim=search_query).execute_agent()
    print(search_result)

    # Return the search result as JSON
    return jsonify({'result': search_result})


@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'})

    if file:
        # filename = file.filename
        # file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        # file.save(file_path)
        connection = sqlite3.connect('data.db')
        df = pd.read_csv(file)
        df.to_sql(file.filename, connection, if_exists="replace")

        # Here, you can process the uploaded file (e.g., read CSV and perform operations)
        return jsonify({'status': 'Success', 'uri': 'sqlite:///data.db'})


@app.route('/checkData', methods=['POST'])
def check_data():
    query = request.json.get('query')
    db_uri = request.json.get('db_uri')
    print("uri1:", db_uri)
    result = DatabaseAgent(claim=query, db_uri=db_uri).execute_agent()
    return jsonify({'result': result})


if __name__ == '__main__':
    app.run(debug=True, port=5001)
