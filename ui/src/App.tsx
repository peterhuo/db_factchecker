import React, { ChangeEvent, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Input, Space } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';
import axios from 'axios';
import { Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { Radio } from 'antd';

const { Title } = Typography;


function App() {
  const slogan = 'Verify any claim ;)))';

  const { Search } = Input;
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [agentType, setAgentType] = useState('wiki');
  const [isUploaded, setIsUploaded] = useState(false);
  const [db_uri, setDbUri] = useState('');
  const [sqlResult, setSqlResult] = useState('');

  const handleChangeAgent = (e: RadioChangeEvent) => {
    console.log('radio checked', e.target.value);
    setAgentType(e.target.value);
  };



  const handleSearchWiki = async (value: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5001/searchWiki', { query: value });
      setSearchResult(response.data.result);
      setIsLoading(false);
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const [file, setFile] = useState<File | null>(null);;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    try {
      setIsUploaded(false);
      const formData = new FormData();
      if (!file) {
        throw new Error('No file selected');
      }
      formData.append('file', file);

      const response = await axios.post('http://localhost:5001/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setDbUri(response.data.uri);
      setIsUploaded(response.data.status === 'Success');
      console.log(response.data)
      setIsUploaded(true);
    } catch (error) {
      console.error('Error uploading file:', error);
    }
  };

  const handleSearchDatasheet = async (value: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5001/checkData', { query: value, db_uri: db_uri });
      setSearchResult(response.data.result);
      setIsLoading(false);
      setSqlResult(response.data.sqlQuery);
      console.log(response)
    } catch (error) {
      console.error('Error searching:', error);
    }
  };

  const handleSearch = async (value: string) => {
    if (agentType === 'wiki') {
      handleSearchWiki(value);
    }
    else if (agentType === 'datasheet') {
      handleSearchDatasheet(value);
    }
  }

  return (
    <div className="App" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Space direction="vertical">
        <Title level={1} >
          {'FactCheck'}
        </Title>
        <div style={{ marginBottom: '10vh' }}>{slogan}</div>

        <Space direction="vertical">
          <Radio.Group onChange={handleChangeAgent} value={agentType}>
            <Radio value={'wiki'}>Wikipedia</Radio>
            <Radio value={'datasheet'}>Upload Data</Radio>
            <Radio value={'tavily'}>Tavily Search</Radio>
          </Radio.Group>
          {agentType === 'datasheet' && <div><input type="file" onChange={handleFileChange} />
            <button onClick={handleUpload}>Upload</button></div>}
          <Search
            placeholder="is Earth flat?"
            enterButton="Check"
            size="large"
            onSearch={handleSearch}
            style={{ width: '50vw', }}
            disabled={agentType === 'datasheet' && !isUploaded}
            loading={isLoading}
          />
          <Title level={4}>
            {sqlResult}
          </Title>
          <Title level={2}>
            {searchResult}
          </Title>
        </Space>
      </Space>
    </div>
  );
}

export default App;
