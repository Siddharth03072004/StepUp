import { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Save, Trash2, FolderOpen, Loader2, Code2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invokeEdgeFunction, supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { toast } from 'sonner';

const languages = [
  { id: 'python', name: 'Python', monacoId: 'python', judgeId: 71 },
  { id: 'javascript', name: 'JavaScript', monacoId: 'javascript', judgeId: 63 },
  { id: 'java', name: 'Java', monacoId: 'java', judgeId: 62 },
  { id: 'cpp', name: 'C++', monacoId: 'cpp', judgeId: 54 },
  { id: 'c', name: 'C', monacoId: 'c', judgeId: 50 },
];

const defaultCode: Record<string, string> = {
  python: `# Python Example
def main():
    print("Hello, World!")
    
if __name__ == "__main__":
    main()
`,
  javascript: `// JavaScript Example
function main() {
    console.log("Hello, World!");
}

main();
`,
  java: `// Java Example
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,
  cpp: `// C++ Example
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,
  c: `// C Example
#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,
};

interface ExecuteCodeResponse {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
}

export default function Playground() {
  const [selectedLanguage, setSelectedLanguage] = useState('python');
  const [code, setCode] = useState(defaultCode.python);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [snippetName, setSnippetName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  // Fetch saved snippets
  const { data: snippets } = useQuery({
    queryKey: ['code-snippets', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('code_snippets')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  // Save snippet mutation
  const saveSnippet = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error('Not authenticated');
      if (!snippetName.trim()) throw new Error('Please enter a name');

      const { data, error } = await supabase
        .from('code_snippets')
        .insert({
          user_id: profile.id,
          title: snippetName.trim(),
          language: selectedLanguage,
          code,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      setSnippetName('');
      setSaveDialogOpen(false);
      toast.success('Snippet saved!');
    },
    onError: (error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  // Delete snippet mutation
  const deleteSnippet = useMutation({
    mutationFn: async (snippetId: string) => {
      const { error } = await supabase
        .from('code_snippets')
        .delete()
        .eq('id', snippetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['code-snippets'] });
      toast.success('Snippet deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete: ' + error.message);
    },
  });

  const handleLanguageChange = (langId: string) => {
    setSelectedLanguage(langId);
    setCode(defaultCode[langId] || '');
  };

  const loadSnippet = (snippet: any) => {
    setSelectedLanguage(snippet.language);
    setCode(snippet.code);
    toast.success(`Loaded "${snippet.title}"`);
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('Running...');

    try {
      const language = languages.find((l) => l.id === selectedLanguage);
      if (!language) throw new Error('Language not supported');

      // Call edge function to execute code
      const data = await invokeEdgeFunction<ExecuteCodeResponse>('execute-code', {
        source_code: code,
        language_id: language.judgeId,
      });

      if (data.stdout) {
        setOutput(data.stdout);
      } else if (data.stderr) {
        setOutput(`Error:\n${data.stderr}`);
      } else if (data.compile_output) {
        setOutput(`Compile Error:\n${data.compile_output}`);
      } else if (data.message) {
        setOutput(`Error: ${data.message}`);
      } else {
        setOutput('No output');
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const currentLanguage = languages.find((l) => l.id === selectedLanguage);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Code Playground</h1>
          <p className="text-muted-foreground mt-1">
            Practice coding in multiple languages
          </p>
        </div>
        <Code2 className="h-12 w-12 text-primary opacity-50" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 h-[calc(100%-5rem)]">
        {/* Editor Section */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          {/* Toolbar */}
          <Card>
            <CardContent className="p-3 flex items-center justify-between gap-3">
              <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Language" />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Save className="h-4 w-4 mr-1" />
                      Save
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Save Snippet</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Input
                        placeholder="Snippet name"
                        value={snippetName}
                        onChange={(e) => setSnippetName(e.target.value)}
                      />
                      <Button
                        onClick={() => saveSnippet.mutate()}
                        disabled={saveSnippet.isPending}
                        className="w-full"
                      >
                        {saveSnippet.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Save Snippet
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button onClick={runCode} disabled={isRunning}>
                  {isRunning ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Play className="h-4 w-4 mr-1" />
                  )}
                  Run
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Code Editor */}
          <Card className="flex-1 overflow-hidden">
            <Editor
              height="100%"
              language={currentLanguage?.monacoId || 'python'}
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: 'on',
              }}
            />
          </Card>

          {/* Output Console */}
          <Card>
            <CardHeader className="py-2 px-4 border-b">
              <CardTitle className="text-sm font-medium">Output</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-40">
                <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
                  {output || 'Click "Run" to execute your code'}
                </pre>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Snippets Sidebar */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FolderOpen className="h-5 w-5" />
              Saved Snippets
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full">
              {snippets && snippets.length > 0 ? (
                <div className="p-2 space-y-2">
                  {snippets.map((snippet: any) => (
                    <motion.div
                      key={snippet.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="group"
                    >
                      <button
                        onClick={() => loadSnippet(snippet)}
                        className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="font-medium truncate">{snippet.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {snippet.language}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSnippet.mutate(snippet.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </button>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-muted-foreground">
                  <FolderOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No snippets saved yet</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
