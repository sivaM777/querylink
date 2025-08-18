import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Modal from "@/components/Modal";
import UserProfile from "@/components/UserProfile";
import {
  ArrowLeft,
  Search,
  Plus,
  BookOpen,
  Star,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Clock,
  User,
  Tag,
  FileText,
  X,
  Heart,
  MessageSquare,
  Share2,
  Brain,
  BarChart3,
} from "lucide-react";

export default function KnowledgeBase() {
  const [articles, setArticles] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);
  const [relatedArticles, setRelatedArticles] = useState<any[]>([]);
  const [newArticle, setNewArticle] = useState({
    title: "",
    content: "",
    category: "",
    tags: "",
    priority: "medium",
  });

  const categories = [
    { value: "all", label: "All Categories" },
    { value: "troubleshooting", label: "Troubleshooting" },
    { value: "how-to", label: "How-to Guides" },
    { value: "known-issues", label: "Known Issues" },
    { value: "best-practices", label: "Best Practices" },
    { value: "security", label: "Security" },
    { value: "network", label: "Network" },
    { value: "database", label: "Database" },
    { value: "authentication", label: "Authentication" },
  ];

  useEffect(() => {
    fetchKnowledgeBase();
  }, []);

  const fetchKnowledgeBase = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/querylinker/knowledge-base");
      if (response.ok) {
        const data = await response.json();
        setArticles(data.articles || []);
      } else {
        console.error("Failed to fetch from API, status:", response.status);
        setArticles([]);
      }
    } catch (error) {
      console.error("Failed to fetch knowledge base:", error);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.tags.some((tag: string) =>
        tag.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    const matchesCategory =
      selectedCategory === "all" || article.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateArticle = async () => {
    if (!newArticle.title || !newArticle.content || !newArticle.category) {
      alert("Please fill in title, content, and category");
      return;
    }

    try {
      const response = await fetch("/api/querylinker/knowledge-base", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": "current-user",
        },
        body: JSON.stringify({
          title: newArticle.title,
          content: newArticle.content,
          category: newArticle.category,
          tags: newArticle.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag),
          priority: newArticle.priority,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          await fetchKnowledgeBase();
          setNewArticle({
            title: "",
            content: "",
            category: "",
            tags: "",
            priority: "medium",
          });
          setShowCreateModal(false);
          alert("Knowledge base article created successfully!");
        } else {
          alert("Failed to create article: " + (data.error || "Unknown error"));
        }
      } else {
        const errorData = await response.json();
        alert(
          "Failed to create article: " + (errorData.error || "Server error"),
        );
      }
    } catch (error) {
      console.error("Error creating article:", error);
      alert("Failed to create article: Network error");
    }
  };

  const handleViewArticle = async (articleId: string) => {
    // Optimistically open modal with local data to avoid any blank state
    const localArticle = articles.find((a) => a.id === articleId);
    if (localArticle) {
      setSelectedArticle({
        ...localArticle,
        tags: Array.isArray(localArticle.tags) ? localArticle.tags : [],
      });
      setShowViewModal(true);

      // Precompute related list from local data
      const relatedLocal = articles
        .filter(
          (article) =>
            article.id !== articleId &&
            (article.category === localArticle.category ||
              (Array.isArray(article.tags) &&
                Array.isArray(localArticle.tags) &&
                article.tags.some((tag: string) =>
                  localArticle.tags.includes(tag),
                ))),
        )
        .slice(0, 5);
      setRelatedArticles(relatedLocal);
    }

    // Then fetch the up-to-date article details in the background
    try {
      const response = await fetch(
        `/api/querylinker/knowledge-base/${articleId}`,
        {
          headers: {
            "X-User-ID": "current-user",
            "X-Session-ID": `session-${Date.now()}`,
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSelectedArticle(data.article);

          // Recompute related articles with freshest data
          const related = articles
            .filter(
              (article) =>
                article.id !== articleId &&
                (article.category === data.article.category ||
                  (Array.isArray(article.tags) &&
                    data.article.tags?.some((tag: string) =>
                      article.tags.includes(tag),
                    ))),
            )
            .slice(0, 5);
          setRelatedArticles(related);

          // Update view count in local state
          setArticles((prev) =>
            prev.map((article) =>
              article.id === articleId
                ? { ...article, views: data.article.views }
                : article,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Error viewing article:", error);
    }
  };

  const handleLikeArticle = async (articleId: string) => {
    try {
      const response = await fetch(
        `/api/querylinker/knowledge-base/${articleId}/like`,
        {
          method: "POST",
          headers: {
            "X-User-ID": "current-user",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles((prev) =>
            prev.map((article) =>
              article.id === articleId
                ? { ...article, likes: data.likes }
                : article,
            ),
          );

          // Update selected article if viewing
          if (selectedArticle && selectedArticle.id === articleId) {
            setSelectedArticle((prev) => ({ ...prev, likes: data.likes }));
          }
        }
      }
    } catch (error) {
      console.error("Error liking article:", error);
    }
  };

  const handleDislikeArticle = async (articleId: string) => {
    try {
      const response = await fetch(
        `/api/querylinker/knowledge-base/${articleId}/dislike`,
        {
          method: "POST",
          headers: {
            "X-User-ID": "current-user",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles((prev) =>
            prev.map((article) =>
              article.id === articleId
                ? { ...article, dislikes: data.dislikes }
                : article,
            ),
          );

          // Update selected article if viewing
          if (selectedArticle && selectedArticle.id === articleId) {
            setSelectedArticle((prev) => ({
              ...prev,
              dislikes: data.dislikes,
            }));
          }
        }
      }
    } catch (error) {
      console.error("Error disliking article:", error);
    }
  };

  const handleRateArticle = async (
    articleId: string,
    rating: number,
    comment?: string,
  ) => {
    try {
      const response = await fetch(
        `/api/querylinker/knowledge-base/${articleId}/rate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-ID": "current-user",
          },
          body: JSON.stringify({ rating, comment }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setArticles((prev) =>
            prev.map((article) =>
              article.id === articleId
                ? { ...article, rating: data.avgRating }
                : article,
            ),
          );
        }
      }
    } catch (error) {
      console.error("Error rating article:", error);
    }
  };

  const getTimeAgo = (date: Date | string) => {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const diff = Math.floor((new Date().getTime() - dateObj.getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-ql-gradient rounded-lg flex items-center justify-center">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-ql-gradient bg-clip-text text-transparent">
                    QueryLinker
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    AI-Powered ITSM Assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link to="/analytics">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Analytics
                  </Link>
                </Button>
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20"
                >
                  v2.1.0
                </Badge>
                <UserProfile />
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          <div className="container mx-auto">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p>Loading Knowledge Base...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-ql-gradient rounded-lg flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-ql-gradient bg-clip-text text-transparent">
                  QueryLinker
                </h1>
                <p className="text-xs text-muted-foreground">
                  AI-Powered ITSM Assistant
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to="/analytics">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Analytics
                </Link>
              </Button>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20"
              >
                v2.1.0
              </Badge>
              <UserProfile />
            </div>
          </div>
        </div>
      </header>

      <div className="p-6">
        <div className="container mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <div>
                <h1 className="text-3xl font-bold">Knowledge Base</h1>
                <p className="text-muted-foreground">
                  Centralized repository of solutions and documentation
                </p>
              </div>
            </div>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Articles
                    </p>
                    <p className="text-xl font-bold">{articles.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Views</p>
                    <p className="text-xl font-bold">
                      {articles.reduce(
                        (sum, article) => sum + article.views,
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-purple-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Total Likes</p>
                    <p className="text-xl font-bold">
                      {articles.reduce(
                        (sum, article) => sum + article.likes,
                        0,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Rating</p>
                    <p className="text-xl font-bold">
                      {articles.length > 0
                        ? (
                            articles.reduce(
                              (sum, article) => sum + article.rating,
                              0,
                            ) / articles.length
                          ).toFixed(1)
                        : "0.0"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Articles List */}
          <div className="space-y-4">
            {filteredArticles.map((article) => (
              <Card
                key={article.id}
                className="hover:shadow-md transition-shadow"
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">
                          {article.title}
                        </h3>
                        <span
                          className={`w-2 h-2 rounded-full ${getPriorityColor(article.priority)}`}
                        ></span>
                        <Badge variant="outline">{article.id}</Badge>
                      </div>
                      <p className="text-muted-foreground text-sm mb-3 line-clamp-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {article.tags.map((tag: string, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="text-xs"
                          >
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewArticle(article.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const rating = prompt("Rate this article (1-5):");
                          if (
                            rating &&
                            parseInt(rating) >= 1 &&
                            parseInt(rating) <= 5
                          ) {
                            const comment = prompt("Optional comment:");
                            handleRateArticle(
                              article.id,
                              parseInt(rating),
                              comment || undefined,
                            );
                          }
                        }}
                      >
                        ⭐ Rate
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground border-t pt-3">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {article.author}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {getTimeAgo(article.updatedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        {article.views} views
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{article.rating}</span>
                      </div>
                      <button
                        className="flex items-center gap-1 hover:text-green-500 transition-colors"
                        onClick={() => handleLikeArticle(article.id)}
                      >
                        <ThumbsUp className="h-4 w-4" />
                        <span>{article.likes}</span>
                      </button>
                      <button
                        className="flex items-center gap-1 hover:text-red-500 transition-colors"
                        onClick={() => handleDislikeArticle(article.id)}
                      >
                        <ThumbsDown className="h-4 w-4" />
                        <span>{article.dislikes || 0}</span>
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredArticles.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No articles found
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm
                    ? "Try adjusting your search terms"
                    : "Start by creating your first knowledge article"}
                </p>
                <Button onClick={() => setShowCreateModal(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Article
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Create Article Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Article"
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              placeholder="Enter article title"
              value={newArticle.title}
              onChange={(e) =>
                setNewArticle({ ...newArticle, title: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Category</label>
            <Select
              value={newArticle.category}
              onValueChange={(value) =>
                setNewArticle({ ...newArticle, category: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.slice(1).map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">
              Tags (comma-separated)
            </label>
            <Input
              placeholder="e.g., database, connection"
              value={newArticle.tags}
              onChange={(e) =>
                setNewArticle({ ...newArticle, tags: e.target.value })
              }
            />
          </div>
          <div>
            <label className="text-sm font-medium">Priority</label>
            <Select
              value={newArticle.priority}
              onValueChange={(value) =>
                setNewArticle({ ...newArticle, priority: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Content</label>
            <Textarea
              placeholder="Write your article content here..."
              value={newArticle.content}
              onChange={(e) =>
                setNewArticle({
                  ...newArticle,
                  content: e.target.value,
                })
              }
              rows={6}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateArticle}>Create Article</Button>
          </div>
        </div>
      </Modal>

      {/* View Article Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Article Details"
        maxWidth="max-w-4xl"
      >
        {selectedArticle && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold">{selectedArticle.title}</h2>
                <Badge variant="outline">{selectedArticle.id}</Badge>
                <span
                  className={`w-3 h-3 rounded-full ${getPriorityColor(selectedArticle.priority)}`}
                ></span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {selectedArticle.author}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {getTimeAgo(selectedArticle.updatedAt)}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-4 w-4" />
                  {selectedArticle.views} views
                </span>
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  {selectedArticle.rating}/5
                </span>
              </div>
              <div className="flex flex-wrap gap-2 mb-4">
                {(Array.isArray(selectedArticle.tags) ? selectedArticle.tags : []).map((tag: string, index: number) => (
                  <Badge key={index} variant="secondary" className="text-sm">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap">
                {selectedArticle.content}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted transition-colors"
                  onClick={() => handleLikeArticle(selectedArticle.id)}
                >
                  <ThumbsUp className="h-4 w-4" />
                  <span>{selectedArticle.likes}</span>
                  <span className="text-sm">Like</span>
                </button>
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted transition-colors"
                  onClick={() => handleDislikeArticle(selectedArticle.id)}
                >
                  <ThumbsDown className="h-4 w-4" />
                  <span>{selectedArticle.dislikes || 0}</span>
                  <span className="text-sm">Dislike</span>
                </button>
                <Button variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const rating = prompt("Rate this article (1-5):");
                  if (
                    rating &&
                    parseInt(rating) >= 1 &&
                    parseInt(rating) <= 5
                  ) {
                    const comment = prompt("Optional comment:");
                    handleRateArticle(
                      selectedArticle.id,
                      parseInt(rating),
                      comment || undefined,
                    );
                  }
                }}
              >
                <Star className="h-4 w-4 mr-2" />
                Rate Article
              </Button>
            </div>

            {relatedArticles.length > 0 && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold mb-4">Related Articles</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedArticles.map((article) => (
                    <Card
                      key={article.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handleViewArticle(article.id)}
                    >
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">{article.title}</h4>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {article.content.substring(0, 100)}...
                        </p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{article.views} views</span>
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            {article.rating}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
