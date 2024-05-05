import React, { ChangeEvent, useState } from 'react';
import logo from './logo.svg';
import './App.css';
import { Input, Space } from 'antd';
import type { SearchProps } from 'antd/es/input/Search';
import axios from 'axios';
import { Typography } from 'antd';
import type { RadioChangeEvent } from 'antd';
import { Radio } from 'antd';
import { Button } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;


function App() {
  const slogan = 'fact check anything ;)))';

  const { Search } = Input;
  const [isLoading, setIsLoading] = useState(false);
  const [searchResult, setSearchResult] = useState('');
  const [agentType, setAgentType] = useState('wiki');
  const [isUploaded, setIsUploaded] = useState(true);
  const [db_uri, setDbUri] = useState('');
  const [sqlResult, setSqlResult] = useState('');
  const [sourcelinks, setSourceLinks] = useState<{ [key: string]: string }>({});

  const handleChangeAgent = (e: RadioChangeEvent) => {
    console.log('radio checked', e.target.value);
    setAgentType(e.target.value);
  };



  const handleSearchWiki = async (value: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5001/searchWiki', { query: value });
      console.log(response.data.source);
      setSearchResult(response.data.result);
      setSourceLinks(response.data.source);
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

  const handleSearchTavily = async (value: string) => {
    try {
      setIsLoading(true);
      const response = await axios.post('http://localhost:5001/searchTavily', { query: value });
      setSearchResult(response.data.result);
      setIsLoading(false);
      console.log(response)
    } catch (error) {
      console.error('Error searching:', error);
    }
  }

  const handleSearch = async (value: string) => {
    if (agentType === 'wiki') {
      handleSearchWiki(value);
    }
    else if (agentType === 'datasheet') {
      handleSearchDatasheet(value);
    }
    else if (agentType === 'tavily') {
      handleSearchTavily(value);
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
            <Button icon={<UploadOutlined />} onClick={handleUpload} loading={!isUploaded}>Upload</Button></div>}
          {/* <button onClick={handleUpload}>Upload</button></div>} */}
          <Search
            placeholder="Enter your question"
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
          {searchResult !== '' && <div><Title level={2}>
            {searchResult}</Title>
            <Title level={4}>
              {Object.keys(sourcelinks).length > 0 && <div>Source:</div>}
              {Object.keys(sourcelinks).map((key) => {
                return <a href={sourcelinks[key]} target="_blank">{key} </a>
              })}</Title> </div>}
        </Space>
      </Space>
    </div>
  );
}

export default App;
